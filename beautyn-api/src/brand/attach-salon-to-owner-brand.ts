import type { PrismaClient } from '@prisma/client';

/**
 * BEA-75 — put a salon the user owns into the user's brand.
 *
 * `salons.brand_id` has exactly two writers, and both guard on `brand_id IS NULL`:
 *  - `BrandRepository.createBrandWithOwner` — the brand is created after the salons
 *    (the normal onboarding order: link CRM → create brand);
 *  - this function — the salon is linked after the brand already exists (a late
 *    Altegio callback, a re-pair, a second CRM). Every CRM link path and the
 *    back-fill script call it, so no path can forget the attach.
 *
 * Both writes are guarded `updateMany`s: each is atomic on its own and a re-run is a
 * no-op, so the caller needs neither a transaction nor a lock. If the second write
 * fails the salon is still in the brand and the next call (or the back-fill) fills
 * `last_selected_salon_id`.
 *
 * A user in several brands is out of scope (BEA-75): the salon is left without a
 * brand and `'ambiguous'` is returned for the caller to log.
 */

export type AttachResult = 'attached' | 'unchanged' | 'no_brand' | 'ambiguous';

/** The slice of a Prisma client this needs — fits `PrismaService`, a transaction client and a script's `PrismaClient`. */
export type AttachDb = Pick<PrismaClient, 'brandMember' | 'salon'>;

export async function attachSalonToOwnerBrand(db: AttachDb, salonId: string, userId: string): Promise<AttachResult> {
  const memberships = await db.brandMember.findMany({
    where: { userId },
    select: { brandId: true },
    orderBy: { createdAt: 'asc' },
    take: 2,
  });
  if (memberships.length === 0) return 'no_brand';
  if (memberships.length > 1) return 'ambiguous';
  const { brandId } = memberships[0];

  const { count } = await db.salon.updateMany({
    where: { id: salonId, ownerUserId: userId, brandId: null },
    data: { brandId },
  });
  // The panel opens on the member's selected salon; an owner whose brand had none
  // gets this one, an owner who already picked one keeps their pick.
  await db.brandMember.updateMany({
    where: { brandId, userId, lastSelectedSalonId: null },
    data: { lastSelectedSalonId: salonId },
  });
  return count > 0 ? 'attached' : 'unchanged';
}
