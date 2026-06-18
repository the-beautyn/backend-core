import { NotFoundException } from '@nestjs/common';
import { CrmType } from '@crm/shared';
import { BookingSyncService } from '../src/booking/booking-sync.service';

// refreshSingle reconciles ONE booking against its CRM (used after the client returns from the
// CRM "Make Change" web page). It loads the row, branches on crmType, pulls just that record, runs
// it through the same upsert+version handler as the bulk sync, then returns the reconciled DTO.
describe('BookingSyncService.refreshSingle', () => {
  const salonId = 'salon-1';

  let prisma: any;
  let crm: any;
  let bookingHandler: any;
  let bookingQuery: any;
  let service: BookingSyncService;

  beforeEach(() => {
    prisma = { booking: { findUnique: jest.fn() } };
    crm = {
      pullAltegioBookings: jest.fn().mockResolvedValue({ items: [{ crmRecordId: 'r1', datetime: '2025-01-01T10:00:00Z', raw: { id: 'r1' } }] }),
      fetchEasyweekBookingDetails: jest.fn().mockResolvedValue({ bookingUuid: 'ew-1', startTime: '2025-01-01T10:00:00Z' }),
    };
    bookingHandler = {
      handleAltegioBooking: jest.fn().mockResolvedValue({ booking: { id: 'b1' }, changed: true }),
      handleEasyweekBooking: jest.fn().mockResolvedValue({ booking: { id: 'b1' }, changed: true }),
    };
    bookingQuery = { getByIds: jest.fn().mockResolvedValue([{ id: 'b1', status: 'created' }]) };
    service = new BookingSyncService(prisma, crm, bookingHandler, bookingQuery);
  });

  it('throws NotFound when the booking does not exist', async () => {
    prisma.booking.findUnique.mockResolvedValue(null);
    await expect(service.refreshSingle('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('Altegio: pulls the single record and runs it through handleAltegioBooking', async () => {
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', salonId, crmType: CrmType.ALTEGIO, crmRecordId: 'r1' });

    const res = await service.refreshSingle('b1');

    expect(crm.pullAltegioBookings).toHaveBeenCalledWith(salonId, ['r1']);
    expect(bookingHandler.handleAltegioBooking).toHaveBeenCalledTimes(1);
    expect(bookingHandler.handleAltegioBooking.mock.calls[0][0].booking.crmRecordId).toBe('r1');
    expect(crm.fetchEasyweekBookingDetails).not.toHaveBeenCalled();
    expect(bookingQuery.getByIds).toHaveBeenCalledWith(['b1']);
    expect(res).toEqual({ id: 'b1', status: 'created' });
  });

  it('EasyWeek: fetches details by uuid and runs them through handleEasyweekBooking', async () => {
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', salonId, crmType: CrmType.EASYWEEK, crmRecordId: 'ew-1' });

    const res = await service.refreshSingle('b1');

    expect(crm.fetchEasyweekBookingDetails).toHaveBeenCalledWith({ salonId, bookingUuid: 'ew-1' });
    expect(bookingHandler.handleEasyweekBooking).toHaveBeenCalledTimes(1);
    expect(bookingHandler.handleEasyweekBooking.mock.calls[0][0].booking.bookingUuid).toBe('ew-1');
    expect(crm.pullAltegioBookings).not.toHaveBeenCalled();
    expect(bookingQuery.getByIds).toHaveBeenCalledWith(['b1']);
    expect(res).toEqual({ id: 'b1', status: 'created' });
  });

  it('returns the current state without hitting the CRM when there is no crmRecordId', async () => {
    prisma.booking.findUnique.mockResolvedValue({ id: 'b1', salonId, crmType: CrmType.ALTEGIO, crmRecordId: null });

    const res = await service.refreshSingle('b1');

    expect(crm.pullAltegioBookings).not.toHaveBeenCalled();
    expect(crm.fetchEasyweekBookingDetails).not.toHaveBeenCalled();
    expect(bookingHandler.handleAltegioBooking).not.toHaveBeenCalled();
    expect(bookingQuery.getByIds).toHaveBeenCalledWith(['b1']);
    expect(res).toEqual({ id: 'b1', status: 'created' });
  });
});
