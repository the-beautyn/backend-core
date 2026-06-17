import { CrmType } from '@crm/shared';
import { BookingSyncService } from '../src/booking/booking-sync.service';

// rebaseFromCrm (Altegio) now pulls the salon's records for the window our bookings span in one
// list call, upserts only the records we own through handleAltegioBooking, discards foreign
// records, and cancels our future bookings that are absent from the list.
describe('BookingSyncService.rebaseFromCrm — Altegio list reconciliation', () => {
  const salonId = 'salon-1';
  const DAY = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();

  let prisma: any;
  let crm: any;
  let bookingHandler: any;
  let bookingQuery: any;
  let service: BookingSyncService;

  // owned local bookings
  const futureA = { id: 'b1', crmRecordId: 'r1', datetime: new Date(now + 10 * DAY), status: 'created' };
  const futureB = { id: 'b2', crmRecordId: 'r2', datetime: new Date(now + 20 * DAY), status: 'created' };
  const pastC = { id: 'b3', crmRecordId: 'r3', datetime: new Date(now - 10 * DAY), status: 'created' };

  beforeEach(() => {
    prisma = {
      booking: {
        findMany: jest.fn().mockResolvedValue([futureA, futureB, pastC]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    crm = {
      resolveSalonProvider: jest.fn().mockResolvedValue(CrmType.ALTEGIO),
      // r1 present (owned), rX present (foreign); r2 & r3 absent.
      listAltegioRecords: jest.fn().mockResolvedValue({
        items: [
          { crmRecordId: 'r1', datetime: iso(now + 10 * DAY), raw: { id: 'r1' } },
          { crmRecordId: 'rX', datetime: iso(now + 5 * DAY), raw: { id: 'rX' } },
        ],
      }),
    };
    bookingHandler = {
      handleAltegioBooking: jest.fn(({ booking }: any) =>
        Promise.resolve({ booking: { id: `local-${booking.crmRecordId}` }, changed: true }),
      ),
    };
    bookingQuery = { getByIds: jest.fn().mockResolvedValue([]) };
    service = new BookingSyncService(prisma, crm, bookingHandler, bookingQuery);
  });

  it('queries the records window with_deleted, derived from local bookings', async () => {
    await service.rebaseFromCrm(salonId);
    expect(crm.listAltegioRecords).toHaveBeenCalledTimes(1);
    const [calledSalonId, params] = crm.listAltegioRecords.mock.calls[0];
    expect(calledSalonId).toBe(salonId);
    expect(params.withDeleted).toBe(true);
    expect(params.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(params.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // end covers our furthest-out booking (~now + 20d); start is before end.
    expect(params.endDate >= new Date(now + 20 * DAY).toISOString().slice(0, 10)).toBe(true);
    expect(params.startDate < params.endDate).toBe(true);
  });

  it('upserts only owned records and never persists foreign ones', async () => {
    await service.rebaseFromCrm(salonId);
    const handled = bookingHandler.handleAltegioBooking.mock.calls.map((c: any[]) => c[0].booking.crmRecordId);
    expect(handled).toEqual(['r1']); // rX (foreign) skipped
  });

  it('cancels future owned bookings absent from the list, but not past ones', async () => {
    await service.rebaseFromCrm(salonId);
    expect(prisma.booking.updateMany).toHaveBeenCalledTimes(1);
    const arg = prisma.booking.updateMany.mock.calls[0][0];
    expect(arg.data.status).toBe('deleted');
    expect(arg.data.cancelledAt).toBeInstanceOf(Date); // stamp the purge moment as the cancellation time
    expect(arg.where.id.in).toEqual(['b2']); // future absent → cancelled; past 'b3' untouched
  });

  it('returns the touched + cancelled bookings', async () => {
    await service.rebaseFromCrm(salonId);
    expect(bookingQuery.getByIds).toHaveBeenCalledWith(['local-r1', 'b2']);
  });

  it('skips entirely when the salon has no local Altegio bookings', async () => {
    prisma.booking.findMany.mockResolvedValueOnce([]);
    const res = await service.rebaseFromCrm(salonId);
    expect(res).toEqual([]);
    expect(crm.listAltegioRecords).not.toHaveBeenCalled();
  });
});
