import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { BookingQueryService } from '../../src/booking/booking-query.service';
import { BookingSyncService } from '../../src/booking/booking-sync.service';
import { CrmIntegrationService } from '../../src/crm-integration/core/crm-integration.service';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../src/shared/guards/roles.guard';
import { SalonAccessGuard } from '../../src/brand/guards/salon-access.guard';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';
import { Reflector } from '@nestjs/core';

describe('Owner bookings API (e2e)', () => {
  let app: INestApplication;
  const salonId = '00000000-0000-0000-0000-000000000010';
  const bookingId = '00000000-0000-0000-0000-000000000020';

  const mockJwtGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        throw new UnauthorizedException();
      }
      req.user = { id: 'owner-user', role: 'owner' };
      return true;
    }),
  };

  const allowGuard = { canActivate: jest.fn().mockResolvedValue(true) };

  const bookingQueryMock = {
    listForSalon: jest.fn().mockResolvedValue({ items: [{ id: bookingId }], next_cursor: null, limit: 20 }),
    getForSalon: jest.fn().mockResolvedValue({ id: bookingId }),
  };
  const bookingSyncMock = {
    rebaseFromCrm: jest.fn().mockResolvedValue([{ id: bookingId }]),
  };
  const crmIntegrationMock = {
    enqueueBookingsSync: jest.fn().mockResolvedValue({ jobId: 'job-e2e' }),
    resolveSalonProvider: jest.fn().mockResolvedValue('ALTEGIO'),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(BookingQueryService)
      .useValue(bookingQueryMock)
      .overrideProvider(BookingSyncService)
      .useValue(bookingSyncMock)
      .overrideProvider(CrmIntegrationService)
      .useValue(crmIntegrationMock)
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideGuard(OwnerRolesGuard)
      .useValue(allowGuard)
      .overrideGuard(SalonAccessGuard)
      .useValue(allowGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    // Mirrors main.ts, so the list query DTO's validation and its string→number
    // transform are exercised here rather than bypassed.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));
    await app.init();
  });

  beforeEach(() => {
    bookingQueryMock.listForSalon.mockClear();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('lists bookings', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/salons/${salonId}/bookings`)
      .set('Authorization', 'Bearer token')
      .expect(200);

    expect(res.body?.data?.items?.[0]?.id).toBe(bookingId);
  });

  it('returns page and total in offset mode', async () => {
    bookingQueryMock.listForSalon.mockResolvedValueOnce({
      items: [{ id: bookingId }],
      limit: 10,
      page: 2,
      total: 1000,
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/salons/${salonId}/bookings?page=2&limit=10&status=created`)
      .set('Authorization', 'Bearer token')
      .expect(200);

    expect(res.body?.data?.total).toBe(1000);
    expect(res.body?.data?.page).toBe(2);
    // Query strings arrive as strings; the DTO's @Type(() => Number) is what makes
    // these numbers by the time the service sees them.
    expect(bookingQueryMock.listForSalon).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, limit: 10, status: 'created' }),
    );
  });

  // BEA-71: the Client Info modal's history is this list filtered to one client.
  it('passes client_id through as the client filter', async () => {
    // A v4-shaped id: @IsUUID() checks the version nibble, and Prisma's uuid() is v4.
    const clientId = '3f2b1c4e-5d6a-4b7c-8d9e-0f1a2b3c4d5e';
    await request(app.getHttpServer())
      .get(`/api/v1/salons/${salonId}/bookings?client_id=${clientId}&status=completed&page=1`)
      .set('Authorization', 'Bearer token')
      .expect(200);

    expect(bookingQueryMock.listForSalon).toHaveBeenCalledWith(
      expect.objectContaining({ clientId, status: 'completed', page: 1 }),
    );
  });

  it.each([
    ['page below 1', 'page=0'],
    ['limit above the cap', 'limit=500'],
    ['a non-numeric page', 'page=abc'],
    ['a malformed date', 'from=not-a-date'],
    ['a non-uuid client_id', 'client_id=abc'],
    ['an unknown param', 'bogus=1'],
  ])('rejects %s', async (_label, qs) => {
    await request(app.getHttpServer())
      .get(`/api/v1/salons/${salonId}/bookings?${qs}`)
      .set('Authorization', 'Bearer token')
      .expect(400);

    expect(bookingQueryMock.listForSalon).not.toHaveBeenCalled();
  });

  it('gets booking by id', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/salons/${salonId}/bookings/${bookingId}`)
      .set('Authorization', 'Bearer token')
      .expect(200);

    expect(res.body?.data?.id).toBe(bookingId);
  });

  it('syncs now', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/salons/${salonId}/bookings/sync`)
      .set('Authorization', 'Bearer token')
      .expect(201);

    expect(res.body?.data?.[0]?.id).toBe(bookingId);
  });

  it('enqueues async sync', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/salons/${salonId}/bookings/sync/async`)
      .set('Authorization', 'Bearer token')
      .expect(201);

    expect(res.body?.data?.jobId).toBe('job-e2e');
  });
});
