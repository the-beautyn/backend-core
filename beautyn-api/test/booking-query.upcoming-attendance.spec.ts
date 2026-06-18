import { PrismaClient } from '@prisma/client';
import { BookingQueryService } from '../src/booking/booking-query.service';

// DB-backed regression for the "booking is invisible in Upcoming until a CRM sync" bug.
//
// The Upcoming filter excludes already-attended visits with a `NOT attended` clause. Prisma
// compiles `NOT: { altegioDetails: { is: { attendance: 1 } } }` to
//   NOT (attendance = 1 AND booking_id IS NOT NULL)
// which is NULL (→ row dropped) when attendance IS NULL — the exact state an app-created Altegio
// booking sits in before its first CRM reconcile. A mocked `findMany` can't catch this; it only
// shows up against a real Postgres. So this suite runs the query for real and auto-skips when no
// local DB is reachable (e.g. CI without the supabase container) so it never breaks those runs.
//
// Run locally with the supabase DB up: `npm test -- booking-query.upcoming-attendance`.
describe('BookingQueryService.listForClient — upcoming visibility vs attendance (DB-backed)', () => {
  const TEST_USER = '00000000-0000-0000-0000-0000000000aa';
  let prisma: PrismaClient;
  let service: BookingQueryService;
  let salonId: string;
  let dbReady = false;

  beforeAll(async () => {
    prisma = new PrismaClient();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const salon = await prisma.salon.create({ data: {} });
      salonId = salon.id;
      service = new BookingQueryService(prisma as any);
      dbReady = true;
    } catch {
      // eslint-disable-next-line no-console
      console.warn('[upcoming-attendance] local DB not reachable — skipping DB-backed checks');
      dbReady = false;
    }
  });

  afterEach(async () => {
    if (dbReady) await prisma.booking.deleteMany({ where: { userId: TEST_USER } });
  });

  afterAll(async () => {
    if (dbReady && salonId) await prisma.salon.deleteMany({ where: { id: salonId } });
    await prisma?.$disconnect();
  });

  const createUpcomingBooking = async (attendance: number | null): Promise<string> => {
    const start = new Date(Date.now() + 60 * 60 * 1000); // 1h out → upcoming
    const booking = await prisma.booking.create({
      data: {
        salonId,
        userId: TEST_USER,
        status: 'created',
        datetime: start,
        endDatetime: new Date(start.getTime() + 60 * 60 * 1000),
        altegioDetails: { create: { attendance } },
      },
    });
    return booking.id;
  };

  const upcomingIds = async (): Promise<string[]> => {
    const res = await service.listForClient({ userId: TEST_USER, status: 'created' });
    return res.items.map((i) => i.id);
  };

  it('includes an app-created Altegio booking whose attendance is NULL (pre-sync)', async () => {
    if (!dbReady) return;
    const id = await createUpcomingBooking(null);
    expect(await upcomingIds()).toContain(id);
  });

  it('includes a reconciled booking whose attendance is 0 (post-sync)', async () => {
    if (!dbReady) return;
    const id = await createUpcomingBooking(0);
    expect(await upcomingIds()).toContain(id);
  });

  it('still excludes a booking the client already attended (attendance = 1)', async () => {
    if (!dbReady) return;
    const id = await createUpcomingBooking(1);
    expect(await upcomingIds()).not.toContain(id);
  });
});
