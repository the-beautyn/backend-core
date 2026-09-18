import { PrismaClient } from '@prisma/client';
import {
  clientFromAltegioClient,
  clientFromEasyweekCustomer,
  resolveClientSnapshot,
  type ClientSnapshot,
} from '../src/booking/client-snapshot';

/**
 * BEA-68 — fill client_name / client_phone / client_email / client_source on bookings
 * that predate the column.
 *
 * Every source is already local, so this makes no CRM calls: Altegio clients are in
 * altegio_booking_client, EasyWeek customers are in the untouched crm_payload, and
 * whatever neither covers falls back to the account that booked.
 *
 * It imports the same `client-snapshot` module the booking handler uses rather than
 * reimplementing the rules in SQL. That matters: the snapshot depends on
 * libphonenumber's validity check, so a back-filled row and a freshly synced one would
 * otherwise disagree on any phone a regex cannot classify.
 *
 * Idempotent — re-running only overwrites rows it can still derive a client for, and
 * skips those already populated unless --force is passed.
 *
 * Usage:
 *   npm run backfill:client:local
 *   npm run backfill:client:dev -- --dry-run
 *   npm run backfill:client:dev -- --force
 */

const BATCH_SIZE = 500;

type Counts = {
  altegio: number;
  easyweek: number;
  user: number;
  skipped: number;
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');
  const prisma = new PrismaClient();
  const counts: Counts = { altegio: 0, easyweek: 0, user: 0, skipped: 0 };

  try {
    // Only rows with nothing yet, unless --force re-derives everything.
    const where = force
      ? {}
      : { clientName: null, clientPhone: null, clientEmail: null };

    const total = await prisma.booking.count({ where });
    console.log(
      `${total} booking(s) to process${dryRun ? ' (dry run — nothing will be written)' : ''}${force ? ' (force: re-deriving populated rows too)' : ''}`,
    );

    let cursor: string | undefined;
    let processed = 0;

    for (;;) {
      const batch = await prisma.booking.findMany({
        where,
        select: {
          id: true,
          userId: true,
          crmType: true,
          crmPayload: true,
          altegioDetails: { select: { client: true } },
        },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      });
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;

      for (const booking of batch) {
        const snapshot = await deriveSnapshot(prisma, booking);
        if (!snapshot.clientSource) {
          counts.skipped++;
          continue;
        }
        counts[snapshot.clientSource]++;
        if (!dryRun) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: snapshot,
          });
        }
      }

      processed += batch.length;
      console.log(`  ${processed}/${total}`);
    }

    console.log(
      `\nDone. altegio=${counts.altegio} easyweek=${counts.easyweek} user=${counts.user} no-client=${counts.skipped}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

async function deriveSnapshot(
  prisma: PrismaClient,
  booking: {
    userId: string | null;
    crmType: string | null;
    crmPayload: unknown;
    altegioDetails: { client: unknown } | null;
  },
): Promise<ClientSnapshot> {
  const fromCrm =
    booking.crmType === 'EASYWEEK'
      ? clientFromEasyweekCustomer(readEasyweekCustomer(booking.crmPayload))
      : clientFromAltegioClient(booking.altegioDetails?.client ?? null);

  // Only read the account when the CRM gave us nothing — same order as the handler.
  const account = booking.userId
    ? await prisma.users.findUnique({
        where: { id: booking.userId },
        select: { name: true, secondName: true, phone: true, email: true },
      })
    : null;

  return resolveClientSnapshot(fromCrm, account);
}

/** EasyWeek's `customer`, in the snake_case shape the raw payload stores. */
function readEasyweekCustomer(payload: unknown) {
  const customer = (payload as any)?.customer;
  if (!customer || typeof customer !== 'object') return null;
  return {
    firstName: customer.first_name ?? customer.firstName ?? null,
    lastName: customer.last_name ?? customer.lastName ?? null,
    phone: customer.phone ?? null,
    email: customer.email ?? null,
  };
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
