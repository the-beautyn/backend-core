import type { LinkerDb } from '../../../src/salon-clients/salon-client-linker.service';

/**
 * Just enough of Prisma for SalonClientLinker: an in-memory `salon_clients` table with
 * equality filtering on the match columns and the oldest-first ordering, plus stubs
 * for bookings, users and the advisory lock. Rows are plain objects so a test can seed
 * and inspect them directly.
 */
export type FakeClientRow = {
  id: string;
  salonId: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  nameKey: string | null;
  phone: string | null;
  email: string | null;
  avatarUrl: string | null;
  userId: string | null;
  altegioClientId: string | null;
  easyweekCustomerId: string | null;
  firstSeenAt: Date;
  lastVisitAt: Date | null;
  bookingsCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type FakeBookingRow = {
  id: string;
  clientId: string | null;
  status: string;
  datetime: Date;
  endDatetime: Date | null;
  /** Altegio attendance = 1. */
  attended?: boolean;
};

const MATCH_COLUMNS = ['salonId', 'userId', 'altegioClientId', 'easyweekCustomerId', 'phone', 'nameKey', 'email', 'id'] as const;

export function createFakeDb() {
  const clients: FakeClientRow[] = [];
  const bookings: FakeBookingRow[] = [];
  const accounts: Record<string, { avatarUrl: string | null }> = {};
  let seq = 0;

  // Equality on the match columns, plus the one OR shape the stale-visit check uses.
  const matches = (row: FakeClientRow, where: Record<string, any>) =>
    MATCH_COLUMNS.every((col) => !(col in where) || row[col] === where[col]) &&
    (!where.NOT?.id || row.id !== where.NOT.id) &&
    (!where.OR ||
      where.OR.some((clause: any) =>
        clause.lastVisitAt === null
          ? row.lastVisitAt === null
          : clause.lastVisitAt?.lt !== undefined && row.lastVisitAt !== null && row.lastVisitAt < clause.lastVisitAt.lt,
      ));

  const oldestFirst = (a: FakeClientRow, b: FakeClientRow) =>
    a.firstSeenAt.getTime() - b.firstSeenAt.getTime() || a.id.localeCompare(b.id);

  const isActive = (b: FakeBookingRow) => !['canceled', 'deleted'].includes(b.status);

  const db = {
    clients,
    bookings,
    /** Seed store for `users.findUnique`. */
    accounts,
    $executeRaw: jest.fn().mockResolvedValue(1),
    salonClient: {
      findFirst: jest.fn(async ({ where }: any) => [...clients].sort(oldestFirst).find((r) => matches(r, where)) ?? null),
      create: jest.fn(async ({ data }: any) => {
        const now = new Date();
        const row: FakeClientRow = {
          id: `client-${++seq}`,
          avatarUrl: null,
          userId: null,
          altegioClientId: null,
          easyweekCustomerId: null,
          lastVisitAt: null,
          bookingsCount: 0,
          createdAt: now,
          updatedAt: now,
          ...data,
        };
        clients.push(row);
        return { id: row.id };
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = clients.find((r) => r.id === where.id);
        if (!row) throw new Error('not found');
        Object.assign(row, data);
        return row;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const row = clients.find((r) => r.id === where.id);
        if (row) Object.assign(row, data);
        return { count: row ? 1 : 0 };
      }),
    },
    booking: {
      findUnique: jest.fn(async ({ where }: any) => {
        const b = bookings.find((x) => x.id === where.id);
        return b ? { clientId: b.clientId } : null;
      }),
      // The attended-early lookup recomputeCounters issues after the grouped queries.
      findMany: jest.fn(async ({ where }: any) => {
        const ids: string[] = where.clientId.in;
        const now: Date = where.OR[0].endDatetime.gte;
        return bookings
          .filter((b) => b.clientId && ids.includes(b.clientId) && isActive(b) && b.attended && (b.endDatetime ?? b.datetime) >= now)
          .map((b) => ({ clientId: b.clientId, datetime: b.datetime }));
      }),
      // The two grouped aggregates recomputeCounters issues: count per client, and max
      // datetime per client over past bookings.
      groupBy: jest.fn(async ({ where, _count, _max }: any) => {
        const ids: string[] = where.clientId.in;
        const now: Date | null = where.OR ? where.OR[0].endDatetime.lt : null;
        const isPastVisit = (b: FakeBookingRow) => !now || (b.endDatetime ?? b.datetime) < now;
        const groups = new Map<string, FakeBookingRow[]>();
        for (const b of bookings) {
          if (!b.clientId || !ids.includes(b.clientId) || !isActive(b) || !isPastVisit(b)) continue;
          groups.set(b.clientId, [...(groups.get(b.clientId) ?? []), b]);
        }
        return [...groups].map(([clientId, rows]) => ({
          clientId,
          ...(_count ? { _count: { _all: rows.length } } : {}),
          ...(_max ? { _max: { datetime: rows.reduce((m, b) => (b.datetime > m ? b.datetime : m), rows[0].datetime) } } : {}),
        }));
      }),
    },
    users: {
      findUnique: jest.fn(async ({ where }: any) => accounts[where.id] ?? null),
    },
  };

  return db as typeof db & LinkerDb;
}
