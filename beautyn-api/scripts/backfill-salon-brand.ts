import { PrismaClient } from '@prisma/client';
import { attachSalonToOwnerBrand } from '../src/brand/attach-salon-to-owner-brand';

/**
 * BEA-75 — put salons that were linked after their owner's brand was created into
 * that brand.
 *
 * Until BEA-75 only brand creation ever wrote `salons.brand_id`, so a salon paired
 * later (late Altegio callback, re-pair, second CRM) stayed at `brand_id = NULL`:
 * invisible to `GET /brand/:id/salons` and to the owner panel. Walks every such
 * salon, owner by owner, through the same `attachSalonToOwnerBrand` the CRM link
 * paths now run at write time, so a back-filled row and a freshly linked row agree.
 * Oldest salon first, so an owner whose brand had no selected salon opens on the
 * oldest one.
 *
 * Idempotent — a second run finds nothing to attach. Safe to run while the API is
 * live: both writes are guarded `updateMany`s (brand_id still NULL, no selected salon
 * yet), so a link or a brand creation that lands meanwhile is never overwritten.
 *
 * Owners with no brand are skipped: brand creation attaches their salons. Owners in
 * several brands are skipped and listed — multi-brand is out of scope for BEA-75 and
 * needs a human to pick the brand.
 *
 * --dry-run reports what a real run would do without writing.
 *
 * Usage:
 *   npm run backfill:salon-brand:local
 *   npm run backfill:salon-brand:dev -- --dry-run
 */

type Counts = { attached: number; lastSelectedSet: number; skippedNoBrand: number; skippedMultiBrand: number };

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const prisma = new PrismaClient();
  const counts: Counts = { attached: 0, lastSelectedSet: 0, skippedNoBrand: 0, skippedMultiBrand: 0 };

  try {
    const orphans = await prisma.salon.findMany({
      where: { brandId: null, ownerUserId: { not: null }, deletedAt: null },
      select: { id: true, ownerUserId: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    console.log(`${orphans.length} salon(s) without a brand${dryRun ? ' (dry run — nothing will be written)' : ''}…`);

    const byOwner = new Map<string, string[]>();
    for (const salon of orphans) {
      const userId = salon.ownerUserId as string;
      byOwner.set(userId, [...(byOwner.get(userId) ?? []), salon.id]);
    }

    for (const [userId, salonIds] of byOwner) {
      const memberships = await prisma.brandMember.findMany({
        where: { userId },
        select: { brandId: true, lastSelectedSalonId: true },
        orderBy: { createdAt: 'asc' },
        take: 2,
      });
      if (memberships.length === 0) {
        counts.skippedNoBrand += salonIds.length;
        console.log(`  skip owner ${userId}: no brand yet (${salonIds.length} salon(s))`);
        continue;
      }
      if (memberships.length > 1) {
        counts.skippedMultiBrand += salonIds.length;
        console.log(`  skip owner ${userId}: belongs to several brands (${salonIds.length} salon(s)) — pick one by hand`);
        continue;
      }

      const willSelect = memberships[0].lastSelectedSalonId == null;
      if (dryRun) {
        counts.attached += salonIds.length;
        if (willSelect) counts.lastSelectedSet += 1;
        console.log(`  owner ${userId}: ${salonIds.length} salon(s) → brand ${memberships[0].brandId}${willSelect ? ', first one becomes selected' : ''}`);
        continue;
      }

      for (const salonId of salonIds) {
        const result = await attachSalonToOwnerBrand(prisma, salonId, userId);
        if (result === 'attached') counts.attached += 1;
        else console.log(`  owner ${userId}, salon ${salonId}: ${result} (changed underneath us, left as is)`);
      }
      if (willSelect) counts.lastSelectedSet += 1;
      console.log(`  owner ${userId}: ${salonIds.length} salon(s) → brand ${memberships[0].brandId}`);
    }

    console.log(
      `\nDone. attached=${counts.attached} last-selected-set=${counts.lastSelectedSet} skipped-no-brand=${counts.skippedNoBrand} skipped-multi-brand=${counts.skippedMultiBrand}${dryRun ? '\n(dry run: nothing was written)' : ''}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
