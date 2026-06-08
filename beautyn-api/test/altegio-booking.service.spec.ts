import { AltegioBookingService } from '../src/booking/altegio-booking/altegio-booking.service';
import { CrmType } from '@crm/shared';
import { BookingHandlerService } from '../src/booking/booking-handler.service';

describe('AltegioBookingService', () => {
  const salonId = 'salon-1';
  const workerId = 'worker-1';
  const serviceId = 'service-1';
  const crmServiceId = '101';
  const crmWorkerId = '201';
  // book_record returns `{ success, data: [{ id, record_id, record_hash }], meta }`;
  // the provider's http() strips the envelope down to `data` (the array).
  const bookRecordResponse = [{ id: 1, record_id: 625547217, record_hash: 'a1b2c3d4' }];
  let prisma: any;
  let crmIntegration: any;
  let users: any;
  let service: AltegioBookingService;
  let bookingHandler: jest.Mocked<BookingHandlerService>;
  let bookingQuery: any;

  beforeEach(() => {
    prisma = {
      salon: {
        findFirst: jest.fn().mockResolvedValue({ id: salonId, provider: CrmType.ALTEGIO, externalSalonId: '999', crmId: '999' }),
      },
      service: {
        findMany: jest.fn(),
      },
      worker: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    crmIntegration = {
      bookServices: jest.fn().mockResolvedValue({ services: [{ id: Number(crmServiceId) }] }),
      bookStaff: jest.fn().mockResolvedValue({ staff: [{ id: Number(crmWorkerId) }] }),
      bookDates: jest.fn().mockResolvedValue({ booking_dates: ['2025-01-01'] }),
      bookTimes: jest.fn().mockResolvedValue({
        times: [{ time: '10:00', datetime: '2025-01-01T10:00:00+03:00', seance_length: 3600, sum_length: 4200 }],
      }),
      createRecord: jest.fn().mockResolvedValue(bookRecordResponse),
    };
    users = {
      findContactInfo: jest.fn().mockResolvedValue({
        id: 'user-1',
        email: 'user@test.com',
        name: 'User',
        second_name: 'Test',
        phone: '+123',
      }),
    };
    bookingHandler = {
      createAltegioBooking: jest.fn(),
      handleAltegioBooking: jest.fn(),
    } as any;
    bookingQuery = { getByIds: jest.fn().mockResolvedValue([]) };
    service = new AltegioBookingService(prisma as any, crmIntegration as any, users as any, bookingHandler, bookingQuery);
  });

  it('returns bookable services with availability flags', async () => {
    prisma.service.findMany
      .mockResolvedValueOnce([
        { id: serviceId, name: 'Cut', price: 1200, duration: 30, categoryId: null, crmServiceId, category: null },
      ])
      .mockResolvedValueOnce([{ id: serviceId, name: 'Cut', price: 1200, duration: 30, categoryId: null, crmServiceId }]);

    const res = await service.getBookableServices(salonId, { selectedServiceIds: [serviceId] });

    expect(crmIntegration.bookServices).toHaveBeenCalledWith(salonId, CrmType.ALTEGIO, { serviceIds: [Number(crmServiceId)], staffId: undefined });
    expect(res.services[0].is_available).toBe(true);
  });

  it('returns workers with slots when requested', async () => {
    prisma.worker.findMany.mockResolvedValue([{ id: workerId, firstName: 'Ann', lastName: 'Doe', position: 'Stylist', photoUrl: null, crmWorkerId }]);
    prisma.service.findMany.mockResolvedValue([{ id: serviceId, crmServiceId, name: 'Cut', price: 1200, duration: 30, categoryId: null }]);
    crmIntegration.bookStaff.mockResolvedValue({ staff: [{ id: Number(crmWorkerId), bookable: true }] });
    crmIntegration.bookTimes.mockResolvedValue({
      times: [
        { time: '10:00', datetime: '2025-01-01T10:00:00+03:00', seance_length: 3600, sum_length: 4200 },
        { time: '11:00', datetime: '2025-01-01T11:00:00+03:00', seance_length: 3600, sum_length: 4200 },
      ],
    });

    const res = await service.getBookableWorkers(salonId, { serviceIds: [serviceId], includeSlots: true });

    expect(res.workers[0].bookable).toBe(true);
    expect(res.workers[0].slots).toBeDefined();
    expect(res.workers[0].slots?.length).toBeGreaterThan(0);
  });

  it('creates online booking and persists booking', async () => {
    prisma.service.findMany.mockResolvedValue([{ id: serviceId, crmServiceId, name: 'Cut', price: 1200, duration: 30, categoryId: null }]);
    prisma.worker.findFirst.mockResolvedValue({ id: workerId, crmWorkerId, firstName: 'John', lastName: 'Doe' });
    bookingHandler.createAltegioBooking.mockResolvedValue({ booking: { id: 'booking-1' }, changed: true });

    const res = await service.createRecord(salonId, 'user-1', {
      workerId,
      serviceIds: [serviceId],
      datetime: '2025-01-01T10:00:00+03:00',
      comment: 'Beautyn',
    });

    expect(crmIntegration.createRecord).toHaveBeenCalledWith(
      salonId,
      CrmType.ALTEGIO,
      expect.objectContaining({
        fullname: 'User Test',
        phone: '+123',
        type: 'mobile',
        appointments: [
          { id: 1, staff_id: Number(crmWorkerId), services: [Number(crmServiceId)], datetime: '2025-01-01T10:00:00+03:00' },
        ],
      }),
    );
    expect(bookingHandler.createAltegioBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        salonId,
        booking: expect.objectContaining({
          crmRecordId: String(bookRecordResponse[0].record_id),
          staffId: String(crmWorkerId),
          clientId: null,
        }),
        userId: 'user-1',
      }),
    );
    expect(res).toEqual({
      booking_id: 'booking-1',
      crm_record_id: bookRecordResponse[0].record_id,
      short_link: null,
      status: 'created',
    });
  });

  it('books with any team member (staff_id 0) when no workerId is given', async () => {
    prisma.service.findMany.mockResolvedValue([{ id: serviceId, crmServiceId, name: 'Cut', price: 1200, duration: 30, categoryId: null }]);
    bookingHandler.createAltegioBooking.mockResolvedValue({ booking: { id: 'booking-1' }, changed: true });

    const res = await service.createRecord(salonId, 'user-1', {
      serviceIds: [serviceId],
      datetime: '2025-01-01T10:00:00+03:00',
    });

    // No worker is resolved when workerId is omitted.
    expect(prisma.worker.findFirst).not.toHaveBeenCalled();
    expect(crmIntegration.createRecord).toHaveBeenCalledWith(
      salonId,
      CrmType.ALTEGIO,
      expect.objectContaining({
        appointments: [
          { id: 1, staff_id: 0, services: [Number(crmServiceId)], datetime: '2025-01-01T10:00:00+03:00' },
        ],
      }),
    );
    // The local booking carries no staff until it syncs back from Altegio.
    expect(bookingHandler.createAltegioBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        booking: expect.objectContaining({ staffId: null }),
      }),
    );
    expect(res.status).toBe('created');
  });

  it('builds the local booking from request data + record id', async () => {
    prisma.service.findMany.mockResolvedValue([{ id: serviceId, crmServiceId, name: 'Cut', price: 1200, duration: 30, categoryId: null }]);
    prisma.worker.findFirst.mockResolvedValue({ id: workerId, crmWorkerId, firstName: 'John', lastName: 'Doe' });
    bookingHandler.createAltegioBooking.mockResolvedValue({ booking: { id: 'booking-1' }, changed: true });

    await service.createRecord(salonId, 'user-1', {
      workerId,
      serviceIds: [serviceId],
      datetime: '2026-01-27T14:00:00+02:00',
      comment: 'Beautyn',
    });

    expect(bookingHandler.createAltegioBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        booking: expect.objectContaining({
          services: [{ id: Number(crmServiceId) }],
          staff: null,
          client: { name: 'User Test', phone: '+123', email: 'user@test.com' },
          seanceLength: null,
          datetime: '2026-01-27T14:00:00+02:00',
          raw: expect.objectContaining({ response: bookRecordResponse[0] }),
        }),
      }),
    );
  });

  it('rejects booking when the user has no phone', async () => {
    prisma.service.findMany.mockResolvedValue([{ id: serviceId, crmServiceId, name: 'Cut', price: 1200, duration: 30, categoryId: null }]);
    prisma.worker.findFirst.mockResolvedValue({ id: workerId, crmWorkerId, firstName: 'John', lastName: 'Doe' });
    users.findContactInfo.mockResolvedValue({ id: 'user-1', email: 'user@test.com', name: 'User', second_name: 'Test', phone: null });

    await expect(
      service.createRecord(salonId, 'user-1', {
        workerId,
        serviceIds: [serviceId],
        datetime: '2025-01-01T10:00:00+03:00',
      }),
    ).rejects.toThrow('Client phone is required to book');
    expect(crmIntegration.createRecord).not.toHaveBeenCalled();
  });
});
