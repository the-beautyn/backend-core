import { BadRequestException } from '@nestjs/common';
import { BookingService } from '../src/booking/booking.service';
import { CrmType } from '@crm/shared';

describe('BookingService', () => {
  const salonId = 'salon-1';
  const bookingUuid = 'ew-uuid';
  const userId = 'user-1';
  let prisma: any;
  let crmIntegration: any;
  let service: BookingService;

  const baseDetails = {
    bookingUuid,
    locationUuid: 'loc-1',
    startTime: '2025-01-01T10:00:00Z',
    endTime: '2025-01-01T11:00:00Z',
    isCompleted: false,
    isCanceled: false,
    statusName: 'created',
    orderedServices: [{ service_uuid: 'svc-1' }],
    raw: { foo: 'bar' },
  };

  beforeEach(() => {
    prisma = {
      booking: { upsert: jest.fn() },
      easyweekBookingDetails: { upsert: jest.fn() },
      easyweekBookingOrder: { upsert: jest.fn() },
      easyweekBookingDuration: { deleteMany: jest.fn(), create: jest.fn() },
      easyweekBookingLink: { deleteMany: jest.fn(), createMany: jest.fn() },
      easyweekOrderedService: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn(async (cb: any) => cb(prisma)),
    };
    crmIntegration = {
      fetchEasyweekBookingDetails: jest.fn().mockResolvedValue(baseDetails),
      getEasyweekWorkspaceSlug: jest.fn().mockResolvedValue('the-best-company'),
    };
    service = new BookingService(prisma as any, crmIntegration as any);
  });

  it('persists EasyWeek booking idempotently', async () => {
    prisma.booking.upsert.mockResolvedValue({
      id: 'booking-1',
      status: 'created',
      datetime: new Date(baseDetails.startTime),
      endDatetime: new Date(baseDetails.endTime),
    });

    const first = await service.confirmEasyweekBooking(salonId, bookingUuid, userId);
    const second = await service.confirmEasyweekBooking(salonId, bookingUuid, userId);

    expect(first.bookingId).toBe('booking-1');
    expect(second.bookingId).toBe('booking-1');
    expect(prisma.booking.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { crmType_crmRecordId: { crmType: CrmType.EASYWEEK, crmRecordId: bookingUuid } },
        create: expect.objectContaining({ crmCompanyId: baseDetails.locationUuid, shortLink: expect.stringContaining(bookingUuid) }),
      }),
    );
    expect(prisma.easyweekBookingDetails.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.easyweekBookingDuration.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.easyweekBookingLink.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.easyweekOrderedService.deleteMany).toHaveBeenCalledTimes(2);
    expect(prisma.easyweekBookingOrder.upsert).toHaveBeenCalledTimes(2);
  });

  it('maps canceled/completed flags to status', async () => {
    crmIntegration.fetchEasyweekBookingDetails.mockResolvedValueOnce({ ...baseDetails, isCanceled: true });
    prisma.booking.upsert.mockResolvedValue({
      id: 'booking-2',
      status: 'canceled',
      datetime: new Date(baseDetails.startTime),
      endDatetime: new Date(baseDetails.endTime),
    });

    await service.confirmEasyweekBooking(salonId, bookingUuid, userId);

    expect(prisma.booking.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ status: 'canceled' }),
      }),
    );
  });

  it('throws when start time is missing', async () => {
    crmIntegration.fetchEasyweekBookingDetails.mockResolvedValueOnce({ ...baseDetails, startTime: null });

    await expect(service.confirmEasyweekBooking(salonId, bookingUuid, userId)).rejects.toBeInstanceOf(BadRequestException);
  });
});
