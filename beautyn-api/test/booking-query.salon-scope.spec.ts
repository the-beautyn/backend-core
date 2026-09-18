import { BookingQueryService } from '../src/booking/booking-query.service';

// BEA-68 gave the owner list the same datetime-driven buckets the client app's My
// Bookings tabs use, by extracting one shared builder. findMany is mocked, so these
// assert the shape of the generated `where` rather than DB-evaluating it.
describe('BookingQueryService.listForSalon scope translation', () => {
  const salonId = 'salon-1';
  const userId = 'user-1';
  const CANCELLED = ['canceled', 'deleted'];
  let findMany: jest.Mock;
  let count: jest.Mock;
  let service: BookingQueryService;

  beforeEach(() => {
    // Freeze the clock: the equivalence test below compares two separately-built
    // `where` objects, and a real clock would put a few ms between their Dates.
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:00:00Z'));
    findMany = jest.fn().mockResolvedValue([]);
    count = jest.fn().mockResolvedValue(0);
    service = new BookingQueryService({
      booking: { findMany, count },
      $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const salonWhere = async (
    status?: string,
    extra: Record<string, unknown> = {},
  ) => {
    await service.listForSalon({ salonId, status, ...extra } as any);
    return findMany.mock.calls.at(-1)![0].where as any;
  };

  it('created → upcoming: not cancelled, in the future, not yet attended', async () => {
    const where = await salonWhere('created');
    expect(where.salonId).toBe(salonId);
    expect(where.status).toEqual({ notIn: CANCELLED });

    const [futureClause, notAttended] = where.AND;
    expect(futureClause.OR[0].endDatetime.gte).toBeInstanceOf(Date);
    expect(notAttended).toEqual({
      OR: [
        { altegioDetails: { is: null } },
        { altegioDetails: { is: { attendance: null } } },
        { altegioDetails: { is: { attendance: { not: 1 } } } },
      ],
    });
  });

  it('completed → past: not cancelled, end/start has passed OR attended', async () => {
    const where = await salonWhere('completed');
    expect(where.status).toEqual({ notIn: CANCELLED });
    expect(where.OR).toHaveLength(3);
    expect(where.OR[2]).toEqual({ altegioDetails: { is: { attendance: 1 } } });
  });

  it('canceled → cancelled bucket: EasyWeek canceled + Altegio deleted', async () => {
    const where = await salonWhere('canceled');
    expect(where).toEqual({ salonId, status: { in: CANCELLED } });
  });

  it('falls back to a literal status match for anything else', async () => {
    const where = await salonWhere('some_other_status');
    expect(where.status).toBe('some_other_status');
    expect(where.AND).toBeUndefined();
    expect(where.OR).toBeUndefined();
  });

  it('honours the from/to window inside a bucket', async () => {
    const from = new Date('2026-06-01T00:00:00Z');
    const to = new Date('2026-06-30T23:59:59Z');
    const where = await salonWhere('created', { from, to });
    expect(where.datetime).toEqual({ gte: from, lte: to });
    expect(where.status).toEqual({ notIn: CANCELLED });
  });

  // The DoD line this ticket exists for: an owner's Активні tab must hold exactly the
  // rows the client app calls upcoming. Asserting the two `where` objects are identical
  // apart from their base key is stronger than checking each shape independently — it
  // fails the moment the two definitions drift.
  it.each(['created', 'completed', 'canceled'])(
    'builds the same where as the client list for %s, apart from the scope key',
    async (status) => {
      const from = new Date('2026-06-01T00:00:00Z');

      await service.listForSalon({ salonId, status, from } as any);
      const ownerWhere = { ...(findMany.mock.calls.at(-1)![0].where as any) };

      await service.listForClient({ userId, status, from } as any);
      const clientWhere = { ...(findMany.mock.calls.at(-1)![0].where as any) };

      expect(ownerWhere.salonId).toBe(salonId);
      expect(clientWhere.userId).toBe(userId);
      delete ownerWhere.salonId;
      delete clientWhere.userId;
      expect(ownerWhere).toEqual(clientWhere);
    },
  );

  describe('client snapshot exposure', () => {
    const row = {
      id: 'b1',
      salonId,
      datetime: new Date('2026-06-15T10:00:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'created',
      clientName: 'Ivan Petrenko',
      clientPhone: '+380950000001',
      clientEmail: 'ivan@example.com',
      clientSource: 'altegio',
      history: [],
    };

    it('returns the client on the owner list', async () => {
      findMany.mockResolvedValue([row]);
      const res = await service.listForSalon({ salonId });
      expect(res.items[0].client).toEqual({
        name: 'Ivan Petrenko',
        phone: '+380950000001',
        email: 'ivan@example.com',
        source: 'altegio',
      });
    });

    // The mapper is shared with the client app's own bookings endpoints. The
    // snapshot is the CRM's record of who the booking is for, which is not always
    // the account holder reading it, and BEA-68 is scoped to the owner panel — so
    // the client paths must not start returning it as a side effect.
    it('withholds it from the client list', async () => {
      findMany.mockResolvedValue([row]);
      const res = await service.listForClient({ userId });
      expect(res.items[0].client).toBeUndefined();
    });
  });

  describe('pagination modes', () => {
    it('uses skip/take and returns a total in offset mode', async () => {
      count.mockResolvedValue(42);
      const res = await service.listForSalon({ salonId, page: 3, limit: 10 });

      const args = findMany.mock.calls.at(-1)![0];
      expect(args.skip).toBe(20);
      expect(args.take).toBe(10);
      // No over-fetch-by-one in offset mode; that trick is only for the cursor.
      expect(args.cursor).toBeUndefined();
      expect(res).toEqual(
        expect.objectContaining({ page: 3, limit: 10, total: 42 }),
      );
      expect(res.next_cursor).toBeUndefined();
      // The count must see the same filter as the page, or the total lies.
      expect(count.mock.calls.at(-1)![0].where).toEqual(args.where);
    });

    it('caps limit at 100 in offset mode, as the cursor path does', async () => {
      await service.listForSalon({ salonId, page: 1, limit: 5000 });
      expect(findMany.mock.calls.at(-1)![0].take).toBe(100);
    });

    it('keeps cursor mode over-fetching by one and omits total', async () => {
      const res = await service.listForSalon({
        salonId,
        cursor: 'booking-9',
        limit: 10,
      });
      const args = findMany.mock.calls.at(-1)![0];
      expect(args.take).toBe(11);
      expect(args.cursor).toEqual({ id: 'booking-9' });
      expect(args.skip).toBe(1);
      expect(res.total).toBeUndefined();
      expect(count).not.toHaveBeenCalled();
    });

    it('rejects page and cursor together rather than silently picking one', async () => {
      await expect(
        service.listForSalon({ salonId, page: 2, cursor: 'booking-9' }),
      ).rejects.toThrow(/page or cursor/i);
      expect(findMany).not.toHaveBeenCalled();
    });

    it('returns an empty page with the real total when page is past the end', async () => {
      count.mockResolvedValue(12);
      findMany.mockResolvedValue([]);
      const res = await service.listForSalon({ salonId, page: 99, limit: 10 });
      expect(res.items).toEqual([]);
      expect(res.total).toBe(12);
    });
  });
});
