import { NotFoundException } from '@nestjs/common';
import { SalonClientsRepository } from '../../../src/salon-clients/salon-clients.repository';
import { SalonClientsService } from '../../../src/salon-clients/salon-clients.service';
import { SalonClientSort } from '../../../src/salon-clients/dto/owner-clients-list.query';

// BEA-71: the owner panel's Clients page — search, four sorts, offset paging with a
// total, and a 404 that does not distinguish "missing" from "another salon's".
describe('SalonClients list and get', () => {
  const salonId = 'salon-1';
  const now = new Date('2026-06-15T12:00:00Z');
  const row = {
    id: 'c1', salonId, displayName: 'Іван Петренко', firstName: 'Іван', lastName: 'Петренко', nameKey: 'петренко іван',
    phone: '+380950000012', email: 'ivan@example.com', avatarUrl: null, userId: 'u1', altegioClientId: '7',
    easyweekCustomerId: null, firstSeenAt: now, lastVisitAt: new Date('2026-06-01T10:00:00Z'), bookingsCount: 3,
    createdAt: now, updatedAt: now,
  };

  let findMany: jest.Mock;
  let count: jest.Mock;
  let findFirst: jest.Mock;
  let repository: SalonClientsRepository;
  let service: SalonClientsService;

  beforeEach(() => {
    findMany = jest.fn().mockResolvedValue([row]);
    count = jest.fn().mockResolvedValue(1);
    findFirst = jest.fn().mockResolvedValue(row);
    repository = new SalonClientsRepository({
      salonClient: { findMany, count, findFirst },
      $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
    } as any);
    service = new SalonClientsService(repository);
  });

  const lastQuery = () => findMany.mock.calls.at(-1)![0];

  describe('search', () => {
    it('is scoped to the salon and absent without q', async () => {
      await service.list(salonId, {});
      expect(lastQuery().where).toEqual({ salonId });
    });

    it('matches name and email case-insensitively', async () => {
      await service.list(salonId, { q: '  Petr ' });
      expect(lastQuery().where.OR).toEqual([
        { displayName: { contains: 'Petr', mode: 'insensitive' } },
        { email: { contains: 'Petr', mode: 'insensitive' } },
      ]);
    });

    it.each([
      ['national format', '0950000012', '950000012'],
      ['spaced international', '+380 95 000', '38095000'],
      ['partial digits', '095 000', '95000'],
    ])('matches the phone by digits — %s', async (_label, q, digits) => {
      await service.list(salonId, { q });
      expect(lastQuery().where.OR).toContainEqual({ phone: { contains: digits } });
    });

    it('does not phone-match on fewer than three digits', async () => {
      await service.list(salonId, { q: 'a1' });
      expect(lastQuery().where.OR.some((c: any) => 'phone' in c)).toBe(false);
    });

    it('counts over the same filter', async () => {
      await service.list(salonId, { q: 'ivan' });
      expect(count.mock.calls[0][0].where).toEqual(lastQuery().where);
    });
  });

  describe('sort', () => {
    it('defaults to name ascending with nulls last', async () => {
      await service.list(salonId, {});
      expect(lastQuery().orderBy).toEqual([{ displayName: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }]);
    });

    it.each([
      [SalonClientSort.NAME_DESC, { displayName: { sort: 'desc', nulls: 'last' } }],
      [SalonClientSort.LAST_VISIT_DESC, { lastVisitAt: { sort: 'desc', nulls: 'last' } }],
      [SalonClientSort.BOOKINGS_DESC, { bookingsCount: 'desc' }],
    ])('orders %s first, with a stable tiebreak', async (sort, primary) => {
      await service.list(salonId, { sort });
      const orderBy = lastQuery().orderBy;
      expect(orderBy[0]).toEqual(primary);
      expect(orderBy.at(-1)).toHaveProperty('id');
    });
  });

  describe('paging', () => {
    it('defaults to page 1 of 20 and returns the total', async () => {
      count.mockResolvedValue(137);
      const res = await service.list(salonId, {});
      expect(lastQuery()).toMatchObject({ skip: 0, take: 20 });
      expect(res).toMatchObject({ page: 1, limit: 20, total: 137 });
    });

    it('translates page/limit to skip/take and caps the limit at 100', async () => {
      await service.list(salonId, { page: 3, limit: 500 });
      expect(lastQuery()).toMatchObject({ skip: 200, take: 100 });
    });
  });

  it('maps rows to the snake_case DTO with ISO dates', async () => {
    const res = await service.list(salonId, {});
    expect(res.items[0]).toEqual({
      id: 'c1',
      display_name: 'Іван Петренко',
      phone: '+380950000012',
      email: 'ivan@example.com',
      avatar_url: null,
      bookings_count: 3,
      last_visit_at: '2026-06-01T10:00:00.000Z',
      user_id: 'u1',
      created_at: now.toISOString(),
    });
  });

  describe('get', () => {
    it('looks the client up within the salon', async () => {
      const dto = await service.get(salonId, 'c1');
      expect(findFirst).toHaveBeenCalledWith({ where: { id: 'c1', salonId } });
      expect(dto.id).toBe('c1');
    });

    it('is a 404 when the row is missing or belongs to another salon', async () => {
      findFirst.mockResolvedValue(null);
      await expect(service.get(salonId, 'c1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
