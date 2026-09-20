import { BookingHandlerService } from '../src/booking/booking-handler.service';

// BEA-71: every booking write resolves the booking's client inside the same
// transaction, stores the id on the row, and recomputes that client's counters.
// A relink recomputes the old client too. Unchanged syncs still attach a client to
// rows that predate the column.
describe('BookingHandlerService — salon client linking', () => {
  const salonId = '00000000-0000-0000-0000-000000000010';
  const when = '2026-06-01T10:00:00.000Z';

  /**
   * A Prisma stand-in that answers any `model.method` with a sensible default:
   * lists come back empty, counts zero, everything else null. Tests override the
   * few calls whose result matters. `$transaction` runs the callback against `tx`
   * so the spec can assert the linker saw the same handle as the writes.
   */
  function fakePrisma(overrides: Record<string, Record<string, jest.Mock>> = {}) {
    const models: Record<string, Record<string, jest.Mock>> = {};
    // Symbols and `then` are jest / await probing the object, not Prisma calls.
    const isProbe = (key: PropertyKey) => typeof key !== 'string' || key === 'then';
    const model = (name: string) =>
      (models[name] ??= new Proxy({} as Record<string, jest.Mock>, {
        get: (target, method: string) =>
          isProbe(method) ? undefined : (target[method] ??=
            overrides[name]?.[method] ??
            jest.fn().mockImplementation(async () => {
              if (method === 'findMany') return [];
              if (method === 'count') return 0;
              if (method === 'createMany' || method === 'deleteMany') return { count: 0 };
              return null;
            })),
      }));
    const tx = new Proxy({} as any, { get: (_, name: string) => (isProbe(name) ? undefined : model(name)) });
    const prisma = new Proxy({} as any, {
      get: (_, name: string) => {
        if (isProbe(name)) return undefined;
        if (name === '$transaction') return async (cb: (t: unknown) => Promise<unknown>) => cb(tx);
        if (name === '__tx') return tx;
        return model(name);
      },
    });
    return { prisma, tx, model };
  }

  const linkerStub = () => ({
    link: jest.fn().mockResolvedValue('client-new'),
    recomputeCounters: jest.fn().mockResolvedValue(undefined),
    refreshLastVisitIfStale: jest.fn().mockResolvedValue(undefined),
    isLastVisitStale: jest.fn().mockResolvedValue(false),
    lockSalon: jest.fn().mockResolvedValue(undefined),
  });

  describe('Altegio', () => {
    const record = {
      crmRecordId: '101',
      datetime: when,
      client: { id: 777, name: 'Іван', surname: 'Петренко', display_name: 'Петренко Іван', phone: '380950000001' },
      raw: { id: 101 },
    };

    it('links on create: identity from the CRM card, client_id on the row, counters after', async () => {
      const { prisma, tx, model } = fakePrisma({ booking: { create: jest.fn().mockResolvedValue({ id: 'b-new' }) } });
      const linker = linkerStub();
      const service = new BookingHandlerService(prisma, linker as any);

      await service.createAltegioBooking({ salonId, userId: 'u1', booking: record as any });

      expect(linker.link).toHaveBeenCalledTimes(1);
      const [db, identity] = linker.link.mock.calls[0];
      expect(db).toBe(tx);
      expect(identity).toMatchObject({
        salonId,
        userId: 'u1',
        altegioClientId: '777',
        easyweekCustomerId: null,
        name: { firstName: 'Іван', lastName: 'Петренко', displayName: 'Петренко Іван' },
        nameKey: 'петренко іван',
        phone: '+380950000001',
        bookingDatetime: new Date(when),
      });
      expect(model('booking').create.mock.calls[0][0].data.clientId).toBe('client-new');
      expect(linker.recomputeCounters).toHaveBeenCalledWith(expect.anything(), ['client-new']);
      // Linking happens before the row exists; counters after the history row.
      expect(linker.link.mock.invocationCallOrder[0]).toBeLessThan(model('booking').create.mock.invocationCallOrder[0]);
      expect(linker.recomputeCounters.mock.invocationCallOrder[0]).toBeGreaterThan(
        model('bookingHistory').create.mock.invocationCallOrder[0],
      );
    });

    it('writes null client_id when the booking has no identity', async () => {
      const { prisma, model } = fakePrisma({ booking: { create: jest.fn().mockResolvedValue({ id: 'b-new' }) } });
      const linker = { ...linkerStub(), link: jest.fn().mockResolvedValue(null) };
      const service = new BookingHandlerService(prisma, linker as any);

      await service.createAltegioBooking({ salonId, booking: { crmRecordId: '102', datetime: when, raw: { id: 102 } } as any });

      expect(model('booking').create.mock.calls[0][0].data.clientId).toBeNull();
      expect(linker.recomputeCounters).toHaveBeenCalledWith(expect.anything(), [null]);
    });

    it('falls back to the link a concurrent sync wrote, not the one read before the lock', async () => {
      // Both lanes read the row unlinked; the other one linked it while this one waited
      // on the salon lock, and this payload has no client block.
      const existing = {
        id: 'b1', salonId, userId: null, clientId: null, status: 'created', version: 1,
        datetime: new Date(when), endDatetime: null, cancelledAt: null, altegioDetails: null,
      };
      const findUnique = jest.fn()
        .mockResolvedValueOnce(existing) // the pre-transaction read
        .mockResolvedValueOnce({ clientId: 'client-from-other-lane' }); // the re-read under the lock
      const { prisma, model } = fakePrisma({ booking: { findUnique } });
      const linker = { ...linkerStub(), link: jest.fn().mockResolvedValue(null) };
      const service = new BookingHandlerService(prisma, linker as any);

      await service.handleAltegioBooking({ booking: { crmRecordId: '101', datetime: when, isDeleted: true, raw: { id: 101 } } as any });

      expect(model('booking').update.mock.calls[0][0].data.clientId).toBe('client-from-other-lane');
      expect(linker.recomputeCounters).toHaveBeenCalledWith(expect.anything(), ['client-from-other-lane', 'client-from-other-lane']);
      // The lock is taken explicitly before the re-read — link() alone would have
      // returned before locking, since this payload has no identity.
      expect(linker.lockSalon).toHaveBeenCalledWith(expect.anything(), salonId);
      expect(linker.lockSalon.mock.invocationCallOrder[0]).toBeLessThan(findUnique.mock.invocationCallOrder[1]);
    });

    it('keeps the existing link when the update payload carries no client at all', async () => {
      const existing = {
        id: 'b1', salonId, userId: null, clientId: 'client-old', status: 'created', version: 1,
        datetime: new Date(when), endDatetime: null, cancelledAt: null, altegioDetails: null,
      };
      const { prisma, model } = fakePrisma({ booking: { findUnique: jest.fn().mockResolvedValue(existing) } });
      const linker = { ...linkerStub(), link: jest.fn().mockResolvedValue(null) };
      const service = new BookingHandlerService(prisma, linker as any);

      // A cancellation that arrives without the nested client block. (findUnique also
      // serves the locked re-read, returning the same row with clientId 'client-old'.)
      await service.handleAltegioBooking({ booking: { crmRecordId: '101', datetime: when, isDeleted: true, raw: { id: 101 } } as any });

      expect(model('booking').update.mock.calls[0][0].data.clientId).toBe('client-old');
      // The status changed, so the client's counters are still recomputed.
      expect(linker.recomputeCounters).toHaveBeenCalledWith(expect.anything(), ['client-old', 'client-old']);
    });

    it('relinks on update and recomputes both the old and the new client', async () => {
      const existing = {
        id: 'b1',
        salonId,
        userId: null,
        clientId: 'client-old',
        status: 'created',
        version: 1,
        datetime: new Date(when),
        endDatetime: null,
        cancelledAt: null,
        altegioDetails: null,
      };
      const { prisma, tx, model } = fakePrisma({ booking: { findUnique: jest.fn().mockResolvedValue(existing) } });
      const linker = linkerStub();
      const service = new BookingHandlerService(prisma, linker as any);

      const res = await service.handleAltegioBooking({ booking: record as any });

      expect(res.changed).toBe(true);
      expect(linker.link.mock.calls[0][0]).toBe(tx);
      expect(linker.link.mock.calls[0][1]).toMatchObject({ salonId, altegioClientId: '777' });
      expect(model('booking').update.mock.calls[0][0].data.clientId).toBe('client-new');
      expect(linker.recomputeCounters).toHaveBeenCalledWith(expect.anything(), ['client-new', 'client-old']);
    });
  });

  describe('EasyWeek', () => {
    it('links on create with the customer uuid', async () => {
      const { prisma, tx, model } = fakePrisma({ booking: { create: jest.fn().mockResolvedValue({ id: 'b-new' }) } });
      const linker = linkerStub();
      const service = new BookingHandlerService(prisma, linker as any);

      await service.createEasyweekBooking({
        salonId,
        booking: {
          uuid: 'ew-b1',
          startTime: when,
          customer: { uuid: 'ew-c1', firstName: 'Іван', lastName: 'Петренко', phone: '+380950000001', email: 'Ivan@Example.com' },
        } as any,
      });

      expect(linker.link.mock.calls[0][0]).toBe(tx);
      expect(linker.link).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          salonId,
          userId: null,
          easyweekCustomerId: 'ew-c1',
          altegioClientId: null,
          nameKey: 'петренко іван',
          phone: '+380950000001',
          email: 'ivan@example.com',
        }),
      );
      expect(model('booking').create.mock.calls[0][0].data.clientId).toBe('client-new');
      expect(linker.recomputeCounters).toHaveBeenCalledWith(expect.anything(), ['client-new']);
    });

    it('uses the account name when EasyWeek sent no customer', async () => {
      const { prisma } = fakePrisma({
        booking: { create: jest.fn().mockResolvedValue({ id: 'b-new' }) },
        users: {
          findUnique: jest.fn().mockResolvedValue({ name: 'Іван', secondName: 'Петренко', phone: '+380950000001', email: null }),
        },
      });
      const linker = linkerStub();
      const service = new BookingHandlerService(prisma, linker as any);

      await service.createEasyweekBooking({ salonId, userId: 'u1', booking: { uuid: 'ew-b2', startTime: when } as any });

      expect(linker.link).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'u1', nameKey: 'петренко іван', phone: '+380950000001' }),
      );
    });
  });

  describe('reconcileClientOnUnchanged (unchanged sync)', () => {
    const identity = { salonId, userId: 'u1' } as any;
    const row = { status: 'created', datetime: new Date(when), endDatetime: null };

    it('costs one unlocked read when the row already has a client and nothing is stale', async () => {
      const { prisma, model } = fakePrisma();
      const linker = linkerStub();
      const service = new BookingHandlerService(prisma, linker as any);
      const existing = { id: 'b1', salonId, clientId: 'client-old', ...row };
      await (service as any).reconcileClientOnUnchanged(existing, identity);
      expect(linker.link).not.toHaveBeenCalled();
      expect(model('booking').update).not.toHaveBeenCalled();
      expect(linker.isLastVisitStale).toHaveBeenCalledWith(prisma, existing);
      expect(linker.lockSalon).not.toHaveBeenCalled();
      expect(linker.refreshLastVisitIfStale).not.toHaveBeenCalled();
    });

    it('recomputes a stale last visit inside a locked transaction', async () => {
      const { prisma, tx } = fakePrisma();
      const linker = { ...linkerStub(), isLastVisitStale: jest.fn().mockResolvedValue(true) };
      const service = new BookingHandlerService(prisma, linker as any);
      const existing = { id: 'b1', salonId, clientId: 'client-old', ...row };
      await (service as any).reconcileClientOnUnchanged(existing, identity);
      expect(linker.lockSalon.mock.calls[0][0]).toBe(tx);
      expect(linker.lockSalon.mock.calls[0][1]).toBe(salonId);
      expect(linker.refreshLastVisitIfStale.mock.calls[0][0]).toBe(tx);
      expect(linker.lockSalon.mock.invocationCallOrder[0]).toBeLessThan(linker.refreshLastVisitIfStale.mock.invocationCallOrder[0]);
    });

    it('leaves the row alone when the other lane attached it while this one waited on the lock', async () => {
      const { prisma, model } = fakePrisma({
        booking: { findUnique: jest.fn().mockResolvedValue({ clientId: 'client-from-other-lane' }) },
      });
      const linker = linkerStub();
      const service = new BookingHandlerService(prisma, linker as any);
      await (service as any).reconcileClientOnUnchanged({ id: 'b1', salonId, clientId: null, ...row }, identity);
      expect(linker.lockSalon).toHaveBeenCalledTimes(1);
      expect(linker.link).not.toHaveBeenCalled();
      expect(model('booking').update).not.toHaveBeenCalled();
    });

    it('links, stores the id and recomputes, without a booking version', async () => {
      const { prisma, tx, model } = fakePrisma();
      const linker = linkerStub();
      const service = new BookingHandlerService(prisma, linker as any);
      await (service as any).reconcileClientOnUnchanged({ id: 'b1', salonId, clientId: null, ...row }, identity);
      // Lock, re-read, then link.
      expect(linker.lockSalon.mock.calls[0][1]).toBe(salonId);
      expect(linker.lockSalon.mock.invocationCallOrder[0]).toBeLessThan(model('booking').findUnique.mock.invocationCallOrder[0]);
      expect(model('booking').findUnique.mock.invocationCallOrder[0]).toBeLessThan(linker.link.mock.invocationCallOrder[0]);
      expect(linker.link.mock.calls[0][0]).toBe(tx);
      expect(linker.link.mock.calls[0][1]).toBe(identity);
      expect(model('booking').update).toHaveBeenCalledWith({ where: { id: 'b1' }, data: { clientId: 'client-new' } });
      expect(linker.recomputeCounters).toHaveBeenCalledWith(expect.anything(), ['client-new']);
      expect(model('bookingHistory').create).not.toHaveBeenCalled();
    });

    it('leaves the row alone when there is still no identity', async () => {
      const { prisma, model } = fakePrisma();
      const linker = { ...linkerStub(), link: jest.fn().mockResolvedValue(null) };
      const service = new BookingHandlerService(prisma, linker as any);
      await (service as any).reconcileClientOnUnchanged({ id: 'b1', salonId, clientId: null, ...row }, identity);
      expect(model('booking').update).not.toHaveBeenCalled();
      expect(linker.refreshLastVisitIfStale).not.toHaveBeenCalled();
      expect(linker.recomputeCounters).not.toHaveBeenCalled();
    });
  });
});
