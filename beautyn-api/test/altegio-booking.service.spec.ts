import { AltegioBookingService } from '../src/booking/altegio-booking/altegio-booking.service';
import { CrmType } from '@crm/shared';
import { BookingHandlerService } from '../src/booking/booking-handler.service';

describe('AltegioBookingService', () => {
  const salonId = 'salon-1';
  const workerId = 'worker-1';
  const serviceId = 'service-1';
  const crmServiceId = '101';
  const crmWorkerId = '201';
  const recordPayload = {
    id: 625547217,
    company_id: 1312212,
    staff_id: 2918233,
    services: [
      {
        id: 13151708,
        title: 'Haircut',
        cost: 300,
        cost_to_pay: 300,
        manual_cost: 300,
        cost_per_unit: 300,
        discount: 0,
        first_cost: 300,
        amount: 1,
      },
    ],
    goods_transactions: [],
    staff: {
      id: 2918233,
      api_id: null,
      name: 'Ali Ambassador',
      specialization: 'Hairdresser',
      position: [],
      avatar: 'https://assets.alteg.io/masters/sm/6/69/69fc6d6c382182c_20251201104007.png',
      avatar_big: 'https://assets.alteg.io/masters/origin/0/0b/0b82823589e0b45_20251201104008.png',
      rating: 0,
      votes_count: 0,
    },
    client: {
      id: 173722637,
      name: 'James Smith',
      surname: '',
      patronymic: '',
      display_name: 'James Smith',
      comment: '',
      phone: '+380950000001',
      card: '',
      email: 'test4@gmail.com',
      success_visits_count: 4,
      fail_visits_count: 0,
      discount: 0,
      custom_fields: [],
      sex: 0,
      birthday: '',
      client_tags: [],
    },
    documents: [
      {
        id: 716000577,
        type_id: 7,
        storage_id: 0,
        user_id: 12801186,
        company_id: 1312212,
        number: 716000577,
        comment: '',
        date_created: '2026-01-27 14:00:00',
        category_id: 0,
        visit_id: 533553883,
        record_id: 625547217,
        type_title: 'Візит',
        is_sale_bill_printed: false,
      },
    ],
    datetime: '2026-01-27T14:00:00+02:00',
    seance_length: 3600,
    short_link: 'https://a5.gl/c/QuTzp/PTJIy/',
  };
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
      createRecord: jest.fn().mockResolvedValue({ data: recordPayload }),
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
    expect(res.services[0].isAvailable).toBe(true);
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

  it('creates record and persists booking', async () => {
    prisma.service.findMany.mockResolvedValue([{ id: serviceId, crmServiceId, name: 'Cut', price: 1200, duration: 30, categoryId: null }]);
    prisma.worker.findFirst.mockResolvedValue({ id: workerId, crmWorkerId, firstName: 'John', lastName: 'Doe' });
    bookingHandler.createAltegioBooking.mockResolvedValue({ bookingId: 'booking-1', changed: true });

    const res = await service.createRecord(salonId, 'user-1', {
      workerId,
      serviceIds: [serviceId],
      datetime: '2025-01-01T10:00:00+03:00',
      comment: 'Beautyn',
      attendance: 1,
    });

    expect(crmIntegration.createRecord).toHaveBeenCalledWith(
      salonId,
      CrmType.ALTEGIO,
      expect.objectContaining({
        staff_id: Number(crmWorkerId),
        services: [{ id: Number(crmServiceId) }],
        datetime: '2025-01-01T10:00:00+03:00',
        seance_length: 4200,
      }),
    );
    expect(bookingHandler.createAltegioBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        salonId,
        booking: expect.objectContaining({
          crmRecordId: String(recordPayload.id),
          staffId: String(recordPayload.staff_id),
          clientId: String(recordPayload.client.id),
        }),
        userId: 'user-1',
      }),
    );
    expect(res).toEqual({
      bookingId: 'booking-1',
      crmRecordId: recordPayload.id,
      shortLink: recordPayload.short_link,
      status: 'created',
    });
  });

  it('passes CRM payload details into handler', async () => {
    prisma.service.findMany.mockResolvedValue([{ id: serviceId, crmServiceId, name: 'Cut', price: 1200, duration: 30, categoryId: null }]);
    prisma.worker.findFirst.mockResolvedValue({ id: workerId, crmWorkerId, firstName: 'John', lastName: 'Doe' });
    bookingHandler.createAltegioBooking.mockResolvedValue({ bookingId: 'booking-1', changed: true });

    await service.createRecord(salonId, 'user-1', {
      workerId,
      serviceIds: [serviceId],
      datetime: recordPayload.datetime,
      comment: 'Beautyn',
      attendance: 1,
    });

    expect(bookingHandler.createAltegioBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        booking: expect.objectContaining({
          services: recordPayload.services,
          documents: recordPayload.documents,
          staff: recordPayload.staff,
          client: recordPayload.client,
          goodsTransactions: recordPayload.goods_transactions,
          raw: recordPayload,
        }),
      }),
    );
  });
});
