import { PrismaClient } from '@prisma/client';
import { hasIdentity, identityFromBookingRow } from '../src/salon-clients/client-identity';
import { SalonClientLinker } from '../src/salon-clients/salon-client-linker.service';

/**
 * BEA-71 — link bookings that predate `bookings.client_id` to their salon client, then
 * recompute every touched client's counters.
 *
 * Walks bookings oldest first through the same linker the booking handler runs at write
 * time, so a back-filled row and a synced row agree. Reads only local data: the client
 * snapshot, the persisted Altegio card, the EasyWeek customer in the raw payload, and
 * the account behind an app booking. No CRM calls.
 *
 * Idempotent — a second run matches the rows the first created and rewrites identical
 * values. Every booking is walked each time (not only unlinked ones) so a rule change
 * or a repaired CRM card is picked up by a re-run.
 *
 * Safe to run while syncs are live: each booking's link + update is one transaction
 * under the linker's per-salon lock, and the booking's client_id is re-read inside it
 * so a newer link from a sync is never overwritten with what this script read earlier.
 * The counter pass takes the same lock per chunk.
 *
 * --dry-run evaluates every booking's identity and reports what would be eligible; it
 * cannot tell a would-be-new row from a would-be-match without writing, so it does not.
 *
 * Usage:
 *   npm run backfill:clients:local
 *   npm run backfill:clients:dev -- --dry-run
 *   npm run backfill:clients:dev -- --salon=<salon uuid>
 */

const BATCH_SIZE = 500;

type Counts = { linked: number; relinked: number; unchanged: number; noIdentity: number };

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const salonArg = process.argv.find((a) => a.startsWith('--salon='))?.slice('--salon='.length);
  const prisma = new PrismaClient();
  const linker = new SalonClientLinker();
  const counts: Counts = { linked: 0, relinked: 0, unchanged: 0, noIdentity: 0 };
  const touchedSalons = new Set<string>();
  const accounts = new Map<string, { name: string | null; secondName: string | null } | null>();

  try {
    const where = salonArg ? { salonId: salonArg } : {};
    const total = await prisma.booking.count({ where });
    console.log(
      `${total} booking(s) to process${salonArg ? ` for salon ${salonArg}` : ''}${dryRun ? ' (dry run — nothing will be written)' : ''}…`,
    );

    // Oldest first, so first_seen_at lands on the first booking. Cursor on id, so the
    // datetime ordering needs the id as a tiebreak to stay stable across batches.
    let cursor: string | undefined;
    let processed = 0;
    for (;;) {
      const batch = await prisma.booking.findMany({
        where,
        select: {
          id: true,
          salonId: true,
          userId: true,
          clientId: true,
          datetime: true,
          crmType: true,
          crmPayload: true,
          clientName: true,
          clientPhone: true,
          clientEmail: true,
          clientSource: true,
          altegioDetails: {
            select: { client: { select: { externalId: true, name: true, surname: true, displayName: true } } },
          },
        },
        orderBy: [{ datetime: 'asc' }, { id: 'asc' }],
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;

      for (const booking of batch) {
        const account = booking.userId ? await loadAccount(prisma, accounts, booking.userId) : null;
        const identity = identityFromBookingRow(booking, account);
        if (!hasIdentity(identity)) {
          counts.noIdentity++;
          continue;
        }
        if (dryRun) {
          // Eligibility only: matching needs the rows a real run creates along the way.
          counts[booking.clientId ? 'unchanged' : 'linked']++;
          continue;
        }
        touchedSalons.add(booking.salonId);
        const outcome = await prisma.$transaction(async (tx) => {
          const clientId = await linker.link(tx, identity);
          if (!clientId) return 'noIdentity' as const;
          // Re-read under the lock: a live sync may have linked this booking since the batch
          // was read. Its link came from a fresher payload than ours, so it wins.
          const current = await tx.booking.findUnique({ where: { id: booking.id }, select: { clientId: true } });
          if (current?.clientId === clientId) return 'unchanged' as const;
          if (current?.clientId && current.clientId !== booking.clientId) return 'unchanged' as const;
          await tx.booking.update({ where: { id: booking.id }, data: { clientId } });
          return current?.clientId ? ('relinked' as const) : ('linked' as const);
        });
        counts[outcome]++;
      }

      processed += batch.length;
      console.log(`  ${processed}/${total}`);
    }

    let clients = 0;
    if (!dryRun) {
      for (const salonId of touchedSalons) {
        const rows = await prisma.salonClient.findMany({ where: { salonId }, select: { id: true } });
        // Short locked transactions per chunk: correct against concurrent booking
        // writes without holding the salon's lock for the whole pass.
        await linker.recomputeCountersLocked(prisma, salonId, rows.map((r) => r.id));
        clients += rows.length;
      }
    }

    console.log(
      `\nDone. linked=${counts.linked} relinked=${counts.relinked} unchanged=${counts.unchanged} no-identity=${counts.noIdentity} clients=${clients} salons=${touchedSalons.size}${dryRun ? '\n(dry run: eligibility only — matching against existing rows is not simulated)' : ''}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

/** One read per distinct account per run; app bookings cluster on few users. */
async function loadAccount(
  prisma: PrismaClient,
  cache: Map<string, { name: string | null; secondName: string | null } | null>,
  userId: string,
) {
  if (!cache.has(userId)) {
    cache.set(
      userId,
      await prisma.users.findUnique({ where: { id: userId }, select: { name: true, secondName: true } }),
    );
  }
  return cache.get(userId) ?? null;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
