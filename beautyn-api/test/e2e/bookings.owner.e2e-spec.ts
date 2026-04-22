import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { BookingQueryService } from '../../src/booking/booking-query.service';
import { BookingSyncService } from '../../src/booking/booking-sync.service';
import { CrmIntegrationService } from '../../src/crm-integration/core/crm-integration.service';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../src/shared/guards/roles.guard';
import { SalonAccessGuard } from '../../src/brand/guards/salon-access.guard';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';

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
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
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
