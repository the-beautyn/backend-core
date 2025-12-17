import { AltegioBookingService } from '../src/booking/altegio-booking/altegio-booking.service';
import { CrmType } from '@crm/shared';

describe('AltegioBookingService', () => {
  const salonId = 'salon-1';
  const workerId = 'worker-1';
  const serviceId = 'service-1';
  const crmServiceId = '101';
  const crmWorkerId = '201';
  let prisma: any;
  let crmIntegration: any;
  let users: any;
  let service: AltegioBookingService;

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
      booking: {
        create: jest.fn(),
      },
    };

    crmIntegration = {
      bookServices: jest.fn().mockResolvedValue({ services: [{ id: Number(crmServiceId) }] }),
      bookStaff: jest.fn().mockResolvedValue({ staff: [{ id: Number(crmWorkerId) }] }),
      bookDates: jest.fn().mockResolvedValue({ booking_dates: ['2025-01-01'] }),
      bookTimes: jest.fn().mockResolvedValue({
        times: [{ time: '10:00', datetime: '2025-01-01T10:00:00+03:00', seance_length: 3600, sum_length: 4200 }],
      }),
      createRecord: jest.fn().mockResolvedValue({ id: 555, short_link: 'https://alt/rec/555' }),
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
    service = new AltegioBookingService(prisma as any, crmIntegration as any, users as any);
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
    prisma.booking.create.mockImplementation(async ({ data }: any) => ({ id: 'booking-1', ...data }));

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
    expect(prisma.booking.create).toHaveBeenCalled();
    expect(res).toEqual({
      bookingId: 'booking-1',
      crmRecordId: 555,
      shortLink: 'https://alt/rec/555',
      status: 'created',
    });
  });
});
