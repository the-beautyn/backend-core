import { BadRequestException } from '@nestjs/common';
import { EasyweekBookingService } from '../src/booking/easyweek-booking/easyweek-booking.service';
import { BookingHandlerService } from '../src/booking/booking-handler.service';

describe('BookingService', () => {
  const salonId = 'salon-1';
  const bookingUuid = 'ew-uuid';
  const userId = 'user-1';
  let prisma: any;
  let crmIntegration: any;
  let service: EasyweekBookingService;
  let bookingHandler: jest.Mocked<BookingHandlerService>;
  let bookingQuery: any;

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
      booking: {
        findUniqueOrThrow: jest.fn(),
      },
    };
    crmIntegration = {
      fetchEasyweekBookingDetails: jest.fn().mockResolvedValue(baseDetails),
      getEasyweekWorkspaceSlug: jest.fn().mockResolvedValue('the-best-company'),
    };
    bookingHandler = {
      createEasyweekBooking: jest.fn(),
      handleEasyweekBooking: jest.fn(),
    } as any;
    bookingQuery = { getByIds: jest.fn().mockResolvedValue([]) };
    service = new EasyweekBookingService(prisma as any, crmIntegration as any, bookingHandler, bookingQuery);
  });

  it('persists EasyWeek booking via handler', async () => {
    bookingHandler.createEasyweekBooking.mockResolvedValue({ booking: { id: 'booking-1' }, changed: true });
    prisma.booking.findUniqueOrThrow.mockResolvedValue({
      id: 'booking-1',
      status: 'created',
      datetime: new Date(baseDetails.startTime),
      endDatetime: new Date(baseDetails.endTime),
    });

    const first = await service.confirmEasyweekBooking(salonId, bookingUuid, userId);
    const second = await service.confirmEasyweekBooking(salonId, bookingUuid, userId);

    expect(first.bookingId).toBe('booking-1');
    expect(second.bookingId).toBe('booking-1');
    expect(bookingHandler.createEasyweekBooking).toHaveBeenCalledTimes(2);
    expect(bookingHandler.createEasyweekBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        salonId,
        booking: expect.objectContaining({ bookingUuid }),
        workspaceSlug: 'the-best-company',
        userId,
      }),
    );
  });

  it('returns booking status from persisted record', async () => {
    bookingHandler.createEasyweekBooking.mockResolvedValue({ booking: { id: 'booking-2' }, changed: true });
    prisma.booking.findUniqueOrThrow.mockResolvedValue({
      id: 'booking-2',
      status: 'canceled',
      datetime: new Date(baseDetails.startTime),
      endDatetime: new Date(baseDetails.endTime),
    });

    const res = await service.confirmEasyweekBooking(salonId, bookingUuid, userId);
    expect(res.status).toBe('canceled');
  });

  it('throws when start time is missing', async () => {
    crmIntegration.fetchEasyweekBookingDetails.mockResolvedValueOnce({ ...baseDetails, startTime: null });
    bookingHandler.createEasyweekBooking.mockRejectedValueOnce(new BadRequestException('EasyWeek booking start_time is missing'));

    await expect(service.confirmEasyweekBooking(salonId, bookingUuid, userId)).rejects.toBeInstanceOf(BadRequestException);
  });
});
