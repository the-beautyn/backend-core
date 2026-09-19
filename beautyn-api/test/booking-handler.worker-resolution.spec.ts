import { BookingHandlerService } from '../src/booking/booking-handler.service';

// A synced Altegio booking names its master by CRM staff id. The workers sync
// stores that id as Worker.crmWorkerId, so that is where the booking's workerId
// must come from. (It used to be read from a WorkerMapping table nothing ever
// wrote to, which left `worker` null on every synced booking.)
describe('BookingHandlerService.resolveWorkerId', () => {
  const salonId = 'salon-1';
  let findFirst: jest.Mock;
  let service: BookingHandlerService;

  beforeEach(() => {
    findFirst = jest.fn();
    service = new BookingHandlerService({ worker: { findFirst } } as any);
  });

  const resolve = (staffId: string) =>
    (service as any).resolveWorkerId(salonId, staffId) as Promise<
      string | null
    >;

  it('finds the worker by CRM staff id within the salon', async () => {
    findFirst.mockResolvedValue({ id: 'worker-uuid' });

    await expect(resolve('2900381')).resolves.toBe('worker-uuid');
    expect(findFirst).toHaveBeenCalledWith({
      where: { salonId, crmWorkerId: '2900381' },
      select: { id: true },
    });
  });

  it('returns null when the salon has no such worker yet', async () => {
    findFirst.mockResolvedValue(null);
    await expect(resolve('999')).resolves.toBeNull();
  });
});

// EasyWeek names the master per ordered service, as `staffer.uuid` (shape from a real
// booking payload). The workers sync stores that uuid as Worker.crmWorkerId, so the
// EasyWeek builder resolves it the same way the Altegio one resolves `staff_id`.
describe('BookingHandlerService.buildEasyweekIncomingState — staffer', () => {
  const salonId = 'salon-1';
  let findFirst: jest.Mock;
  let service: BookingHandlerService;

  const orderedService = (staffer: unknown) => ({
    uuid: 'e5ac964c-dffe-4588-9504-b039224565cf',
    name: 'Kill Bill',
    currency: 'UAH',
    price: 25000,
    duration: { value: 100, label: 'minutes' },
    staffer,
  });

  const build = (orderedServices: unknown[]) =>
    (service as any).buildEasyweekIncomingState({
      salonId,
      userId: null,
      status: 'created',
      datetime: new Date('2026-10-22T12:00:00Z'),
      endDatetime: new Date('2026-10-22T13:40:00Z'),
      comment: null,
      crmRecordId: '0c5b3032-2a6f-4498-b00c-be0a7e168476',
      crmCompanyId: '25fd5793-3025-40db-85e9-bcb7ebbf11d7',
      shortLink: null,
      crmPayload: null,
      links: [],
      orderedServices,
      order: null,
      duration: null,
      client: {
        clientName: null,
        clientPhone: null,
        clientEmail: null,
        clientSource: null,
      },
    }) as Promise<{
      crmStaffId: string | null;
      workerId: string | null;
      snapshot: any;
    }>;

  beforeEach(() => {
    findFirst = jest.fn();
    service = new BookingHandlerService({ worker: { findFirst } } as any);
  });

  it('resolves the staffer uuid to the salon worker and puts both in the snapshot', async () => {
    findFirst.mockResolvedValue({ id: 'worker-dima' });
    const staffer = {
      uuid: '2fd3b206-e0a3-48c8-9056-779c73f9022b',
      first_name: 'Dima',
      last_name: 'Pogreb',
    };

    const incoming = await build([orderedService(staffer)]);

    expect(findFirst).toHaveBeenCalledWith({
      where: { salonId, crmWorkerId: staffer.uuid },
      select: { id: true },
    });
    expect(incoming.crmStaffId).toBe(staffer.uuid);
    expect(incoming.workerId).toBe('worker-dima');
    expect(incoming.snapshot.booking).toMatchObject({
      crmStaffId: staffer.uuid,
      workerId: 'worker-dima',
    });
  });

  it('keeps the staffer uuid but no worker when the workers sync has not caught up', async () => {
    findFirst.mockResolvedValue(null);
    const incoming = await build([orderedService({ uuid: 'unknown-staffer' })]);
    expect(incoming.crmStaffId).toBe('unknown-staffer');
    expect(incoming.workerId).toBeNull();
  });

  it('takes the first service that names a staffer', async () => {
    findFirst.mockResolvedValue({ id: 'worker-2' });
    const incoming = await build([
      orderedService(null),
      orderedService({ uuid: 'second' }),
    ]);
    expect(incoming.crmStaffId).toBe('second');
  });

  it('leaves both null for a booking with no staffer at all', async () => {
    const incoming = await build([orderedService(null)]);
    expect(findFirst).not.toHaveBeenCalled();
    expect(incoming.crmStaffId).toBeNull();
    expect(incoming.workerId).toBeNull();
  });
});
