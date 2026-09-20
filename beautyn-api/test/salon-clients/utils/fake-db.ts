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
};

const MATCH_COLUMNS = ['salonId', 'userId', 'altegioClientId', 'easyweekCustomerId', 'phone', 'nameKey', 'email', 'id'] as const;

export function createFakeDb() {
  const clients: FakeClientRow[] = [];
  const bookings: FakeBookingRow[] = [];
  const accounts: Record<string, { avatarUrl: string | null }> = {};
  let seq = 0;

  const matches = (row: FakeClientRow, where: Record<string, unknown>) =>
    MATCH_COLUMNS.every((col) => !(col in where) || row[col] === where[col]);

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
      count: jest.fn(async ({ where }: any) =>
        bookings.filter((b) => b.clientId === where.clientId && isActive(b)).length,
      ),
      findFirst: jest.fn(async ({ where }: any) => {
        const now: Date = where.OR[0].endDatetime.lt;
        const past = bookings
          .filter((b) => b.clientId === where.clientId && isActive(b))
          .filter((b) => (b.endDatetime ?? b.datetime) < now)
          .sort((a, b) => b.datetime.getTime() - a.datetime.getTime());
        return past[0] ? { datetime: past[0].datetime } : null;
      }),
    },
    users: {
      findUnique: jest.fn(async ({ where }: any) => accounts[where.id] ?? null),
    },
  };

  return db as typeof db & LinkerDb;
}
