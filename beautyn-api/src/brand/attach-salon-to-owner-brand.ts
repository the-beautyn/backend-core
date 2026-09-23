import type { Prisma, PrismaClient } from '@prisma/client';

/**
 * BEA-75 — put a salon the user owns into the brand the user owns.
 *
 * `salons.brand_id` has exactly two writers, and both guard on `brand_id IS NULL`:
 *  - `BrandRepository.createBrandWithOwner` — the brand is created after the salons
 *    (the normal onboarding order: link CRM → create brand);
 *  - this function — the salon is linked after the brand already exists (a late
 *    Altegio callback, a re-pair, a second CRM). Every CRM link path and the
 *    back-fill script call it, so no path can forget the attach.
 *
 * Both writers take the owner's advisory lock (`lockOwnerBrand`) for the length of
 * their transaction. Without it a brand creation and a late link can interleave so
 * that each sees the other's rows as not yet there — the brand's `updateMany` runs
 * before the salon commits, the link's membership lookup runs before the membership
 * commits — and both commit with the salon still orphaned. With the lock, whichever
 * runs second sees what the first committed and the guarded writes finish the job.
 *
 * Only an `owner` membership counts: the CRM link endpoints accept any signed-in
 * user, and a manager's salon must not land in the brand they merely work for. A
 * user who owns several brands is out of scope (BEA-75): the salon is left without
 * a brand and `'ambiguous'` is returned for the caller to log.
 */

export type AttachResult = 'attached' | 'unchanged' | 'no_brand' | 'ambiguous';

/** Fits `PrismaService` and a script's `PrismaClient`. */
export type AttachDb = Pick<PrismaClient, '$transaction'>;

/**
 * Serialises everything that decides which brand an owner's salons belong to.
 * Transaction-scoped: released at commit/rollback, so callers only have to hold it
 * inside the transaction that does the writes.
 */
export async function lockOwnerBrand(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  // $executeRaw, not $queryRaw: the lock function returns void.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'owner_brand:' + userId}))`;
}

export async function attachSalonToOwnerBrand(db: AttachDb, salonId: string, userId: string): Promise<AttachResult> {
  return db.$transaction(async (tx) => {
    await lockOwnerBrand(tx, userId);

    const memberships = await tx.brandMember.findMany({
      where: { userId, role: 'owner' },
      select: { brandId: true },
      orderBy: { createdAt: 'asc' },
      take: 2,
    });
    if (memberships.length === 0) return 'no_brand';
    if (memberships.length > 1) return 'ambiguous';
    const { brandId } = memberships[0];

    const { count } = await tx.salon.updateMany({
      where: { id: salonId, ownerUserId: userId, brandId: null },
      data: { brandId },
    });
    // The panel opens on the member's selected salon; an owner whose brand had none
    // gets this one, an owner who already picked one keeps their pick. The relation
    // filter makes the write depend on the salon really being in this brand now —
    // attached above or already there — never on a salon that sits in another brand.
    await tx.brandMember.updateMany({
      where: { brandId, userId, lastSelectedSalonId: null, brand: { salons: { some: { id: salonId } } } },
      data: { lastSelectedSalonId: salonId },
    });
    return count > 0 ? 'attached' : 'unchanged';
  });
}
