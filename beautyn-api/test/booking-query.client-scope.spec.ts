import { BookingQueryService } from '../src/booking/booking-query.service';

// The My Bookings tabs send `status` as a bucket selector; listForClient translates it into
// a datetime-driven WHERE evaluated at read-time. findMany is mocked, so we assert the shape
// of the generated `where` for each bucket rather than DB-evaluating it.
describe('BookingQueryService.listForClient scope translation', () => {
  const userId = 'user-1';
  const CANCELLED = ['canceled', 'deleted'];
  let findMany: jest.Mock;
  let service: BookingQueryService;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([]);
    service = new BookingQueryService({ booking: { findMany } } as any);
  });

  const whereFor = async (status?: string, extra: Record<string, unknown> = {}) => {
    await service.listForClient({ userId, status, ...extra } as any);
    return findMany.mock.calls[0][0].where as any;
  };

  it('created → upcoming: not cancelled, in the future, not yet attended', async () => {
    const where = await whereFor('created');
    expect(where.userId).toBe(userId);
    expect(where.status).toEqual({ notIn: CANCELLED });

    const [futureClause, notAttended] = where.AND;
    expect(futureClause.OR[0].endDatetime.gte).toBeInstanceOf(Date);
    expect(futureClause.OR[1].AND[0]).toEqual({ endDatetime: null });
    expect(futureClause.OR[1].AND[1].datetime.gte).toBeInstanceOf(Date);
    // Only attendance=1 (arrived) is pushed out of upcoming. The clause is spelled out as a
    // NULL-safe OR — a plain `NOT: { ...is: { attendance: 1 } }` compiles to SQL that drops
    // rows where attendance IS NULL (app-created Altegio bookings before a CRM sync), so we
    // include the null / no-details cases explicitly.
    expect(notAttended).toEqual({
      OR: [
        { altegioDetails: { is: null } },
        { altegioDetails: { is: { attendance: null } } },
        { altegioDetails: { is: { attendance: { not: 1 } } } },
      ],
    });
  });

  it('completed → past: not cancelled, end/start has passed OR attended', async () => {
    const where = await whereFor('completed');
    expect(where.status).toEqual({ notIn: CANCELLED });
    expect(where.OR).toHaveLength(3);
    expect(where.OR[0].endDatetime.lt).toBeInstanceOf(Date);
    expect(where.OR[1].AND[0]).toEqual({ endDatetime: null });
    expect(where.OR[1].AND[1].datetime.lt).toBeInstanceOf(Date);
    expect(where.OR[2]).toEqual({ altegioDetails: { is: { attendance: 1 } } });
  });

  it('canceled → cancelled bucket: EasyWeek canceled + Altegio deleted', async () => {
    const where = await whereFor('canceled');
    expect(where).toEqual({ userId, status: { in: CANCELLED } });
  });

  it('uses one consistent `now` across the upcoming window', async () => {
    const where = await whereFor('created');
    const topGte = where.AND[0].OR[0].endDatetime.gte;
    const nestedGte = where.AND[0].OR[1].AND[1].datetime.gte;
    expect(nestedGte).toEqual(topGte);
  });

  it('falls back to legacy status + date-range filter for other statuses', async () => {
    const from = new Date('2025-01-01T00:00:00Z');
    const where = await whereFor('some_other_status', { from });
    expect(where.status).toBe('some_other_status');
    expect(where.datetime).toEqual({ gte: from });
    expect(where.AND).toBeUndefined();
    expect(where.OR).toBeUndefined();
  });
});
