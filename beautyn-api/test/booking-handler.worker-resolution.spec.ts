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
