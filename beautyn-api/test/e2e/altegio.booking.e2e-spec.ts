import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { ProviderFactory } from '@crm/provider-core';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';
import { CrmType } from '@crm/shared';
import { UserService } from '../../src/user/user.service';

describe('Altegio booking flow (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;
  let providerMock: any;
  const salonId = '00000000-0000-0000-0000-00000000a001';
  const workerId = '00000000-0000-0000-0000-00000000a002';
  const serviceId = '00000000-0000-0000-0000-00000000a003';
  const crmServiceId = '501';
  const crmWorkerId = '701';
  const resetProviderMocks = () => {
    providerMock.getBookServices.mockResolvedValue({ services: [{ id: Number(crmServiceId) }] });
    providerMock.getBookStaff.mockResolvedValue({ staff: [{ id: Number(crmWorkerId), bookable: true }] });
    providerMock.getBookDates.mockResolvedValue({ booking_dates: ['2025-01-02'] });
    providerMock.getBookTimes.mockResolvedValue({
      times: [{ time: '10:00', datetime: '2025-01-02T10:00:00+03:00', seance_length: 3600, sum_length: 4200 }],
    });
    providerMock.createRecord.mockResolvedValue({ id: 9001, short_link: 'https://alt/9001' });
  };

  beforeAll(async () => {
    const mockJwtGuard = {
      canActivate: jest.fn().mockImplementation((context) => {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
          throw new UnauthorizedException();
        }
        req.user = { id: 'user-e2e', role: 'client' };
        return true;
      }),
    };

    prismaMock = {
      salon: {
        findFirst: jest.fn().mockResolvedValue({ id: salonId, provider: CrmType.ALTEGIO, externalSalonId: '12345', crmId: '12345' }),
      },
      service: {
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          const filterIds = where?.id?.in as string[] | undefined;
          if (filterIds && !filterIds.includes(serviceId)) return [];
          return [
            { id: serviceId, name: 'Haircut', price: 1000, duration: 30, categoryId: null, crmServiceId, category: null },
          ];
        }),
      },
      worker: {
        findMany: jest.fn().mockResolvedValue([
          { id: workerId, firstName: 'Ann', lastName: 'Doe', position: 'Stylist', photoUrl: null, crmWorkerId },
        ]),
        findFirst: jest.fn().mockImplementation(({ where }: any) =>
          where.id === workerId ? { id: workerId, firstName: 'Ann', lastName: 'Doe', position: 'Stylist', crmWorkerId } : null,
        ),
      },
      booking: {
        create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'booking-e2e', ...data })),
      },
    } as Partial<PrismaService> as any;

    providerMock = {
      init: jest.fn().mockResolvedValue(undefined),
      getBookServices: jest.fn(),
      getBookStaff: jest.fn(),
      getBookDates: jest.fn(),
      getBookTimes: jest.fn(),
      createRecord: jest.fn(),
    };
    resetProviderMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(ProviderFactory)
      .useValue({ make: jest.fn().mockReturnValue(providerMock) })
      .overrideProvider(UserService)
      .useValue({
        findContactInfo: jest.fn().mockResolvedValue({
          id: 'user-e2e',
          email: 'user@e2e.test',
          name: 'User',
          second_name: 'Test',
          phone: '+123',
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    const ti = app.get(TransformInterceptor);
    app.useGlobalInterceptors(ti);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exposes booking availability and create record endpoints', async () => {
    resetProviderMocks();
    const servicesResp = await request(app.getHttpServer())
      .get(`/api/v1/booking/altegio/${salonId}/services`)
      .query({ 'selectedServiceIds[]': serviceId })
      .expect(200);
    expect(servicesResp.body.success).toBe(true);
    expect(servicesResp.body.data.services[0].isAvailable).toBe(true);

    const workersResp = await request(app.getHttpServer())
      .get(`/api/v1/booking/altegio/${salonId}/workers`)
      .query({ 'serviceIds[]': serviceId, datetime: '2025-01-02T10:00:00+03:00' })
      .expect(200);
    expect(workersResp.body.data.workers[0].bookable).toBe(true);

    const timesResp = await request(app.getHttpServer())
      .get(`/api/v1/booking/altegio/${salonId}/timeslots`)
      .query({ date: '2025-01-02', 'serviceIds[]': serviceId, workerId })
      .expect(200);
    expect(timesResp.body.data.slots[0].time).toBe('10:00');

    const createResp = await request(app.getHttpServer())
      .post(`/api/v1/booking/altegio/${salonId}/records`)
      .set('Authorization', 'Bearer valid')
      .send({ workerId, serviceIds: [serviceId], datetime: '2025-01-02T10:00:00+03:00' })
      .expect(201);

    expect(createResp.body.data.bookingId).toBe('booking-e2e');
    expect(providerMock.createRecord).toHaveBeenCalled();
  });

  it('returns worker slots when includeSlots=true', async () => {
    resetProviderMocks();
    providerMock.getBookTimes.mockResolvedValue({
      times: [
        { time: '09:00', datetime: '2025-01-02T09:00:00+03:00', seance_length: 3600, sum_length: 4200 },
        { time: '10:00', datetime: '2025-01-02T10:00:00+03:00', seance_length: 3600, sum_length: 4200 },
      ],
    });

    const workersResp = await request(app.getHttpServer())
      .get(`/api/v1/booking/altegio/${salonId}/workers`)
      .query({ 'serviceIds[]': serviceId, includeSlots: 'true', datetime: '2025-01-02T09:30:00+03:00' })
      .expect(200);

    expect(workersResp.body.data.workers[0].slots).toBeDefined();
    expect(workersResp.body.data.workers[0].slots.length).toBeGreaterThan(0);
  });

  it('filters dates by service and worker', async () => {
    resetProviderMocks();
    providerMock.getBookDates.mockResolvedValue({ booking_dates: ['2025-01-03'] });

    const datesResp = await request(app.getHttpServer())
      .get(`/api/v1/booking/altegio/${salonId}/dates`)
      .query({ 'serviceIds[]': serviceId, workerId, dateFrom: '2025-01-01', dateTo: '2025-01-07' })
      .expect(200);

    expect(datesResp.body.data.bookingDates).toEqual(['2025-01-03']);
  });

  it('returns any-worker timeslots when worker not provided', async () => {
    resetProviderMocks();
    providerMock.getBookTimes.mockResolvedValue({
      times: [{ time: '11:00', datetime: '2025-01-04T11:00:00+03:00', seance_length: 3600, sum_length: 4200 }],
    });

    const timesResp = await request(app.getHttpServer())
      .get(`/api/v1/booking/altegio/${salonId}/timeslots`)
      .query({ date: '2025-01-04', 'serviceIds[]': serviceId })
      .expect(200);

    expect(timesResp.body.data.slots[0].time).toBe('11:00');
  });
});
