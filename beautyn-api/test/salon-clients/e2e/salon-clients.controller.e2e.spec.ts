import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, INestApplication, NotFoundException, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { SalonClientsController } from '../../../src/api-gateway/v1/authenticated/salon-clients.controller';
import { SalonClientsService } from '../../../src/salon-clients/salon-clients.service';
import { JwtAuthGuard } from '../../../src/shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../src/shared/guards/roles.guard';
import { SalonAccessGuard } from '../../../src/brand/guards/salon-access.guard';
import { TransformInterceptor } from '../../../src/shared/interceptors/transform.interceptor';

// BEA-71 owner endpoints, as a controllers-only slice: guards and validation are the
// subject, the service is a mock.
describe('SalonClientsController (e2e)', () => {
  let app: INestApplication;
  const salonId = '00000000-0000-0000-0000-000000000010';
  const clientId = '3f2b1c4e-5d6a-4b7c-8d9e-0f1a2b3c4d5e';
  const service = { list: jest.fn(), get: jest.fn() } as unknown as jest.Mocked<SalonClientsService>;

  const mockJwtGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null;
      if (token === 'owner-token') return (req.user = { id: 'owner-1', role: 'owner' }), true;
      if (token === 'client-token') return (req.user = { id: 'client-1', role: 'client' }), true;
      throw new UnauthorizedException();
    }),
  };
  const mockOwnerRolesGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      if (context.switchToHttp().getRequest().user?.role !== 'owner') throw new ForbiddenException();
      return true;
    }),
  };
  const mockSalonAccessGuard = { canActivate: jest.fn().mockReturnValue(true) };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SalonClientsController],
      providers: [{ provide: SalonClientsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard).useValue(mockJwtGuard)
      .overrideGuard(OwnerRolesGuard).useValue(mockOwnerRolesGuard)
      .overrideGuard(SalonAccessGuard).useValue(mockSalonAccessGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    // Same pipe as main.ts, so the DTO's whitelist and coercion are what get tested.
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));
    await app.init();
  });

  afterAll(async () => app.close());
  beforeEach(() => jest.clearAllMocks());

  const base = `/api/v1/salons/${salonId}/clients`;

  it('lists clients with the query passed through, typed', async () => {
    service.list.mockResolvedValue({ items: [], page: 2, limit: 10, total: 0 });
    const res = await request(app.getHttpServer())
      .get(`${base}?q=095&sort=bookings_desc&page=2&limit=10`)
      .set('Authorization', 'Bearer owner-token')
      .expect(200);
    expect(res.body).toEqual({ success: true, data: { items: [], page: 2, limit: 10, total: 0 } });
    expect(service.list).toHaveBeenCalledWith(salonId, { q: '095', sort: 'bookings_desc', page: 2, limit: 10 });
  });

  it.each([
    ['an unknown sort', 'sort=oldest'],
    ['page below 1', 'page=0'],
    ['limit above the cap', 'limit=500'],
    ['an unknown param', 'bogus=1'],
  ])('rejects %s', async (_label, qs) => {
    await request(app.getHttpServer()).get(`${base}?${qs}`).set('Authorization', 'Bearer owner-token').expect(400);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('rejects a non-uuid salon id before reaching the service', async () => {
    await request(app.getHttpServer()).get('/api/v1/salons/salon-1/clients').set('Authorization', 'Bearer owner-token').expect(400);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('gets one client', async () => {
    service.get.mockResolvedValue({ id: clientId } as any);
    const res = await request(app.getHttpServer()).get(`${base}/${clientId}`).set('Authorization', 'Bearer owner-token').expect(200);
    expect(res.body.data.id).toBe(clientId);
    expect(service.get).toHaveBeenCalledWith(salonId, clientId);
  });

  it('propagates a 404 in the envelope', async () => {
    service.get.mockRejectedValue(new NotFoundException('Client not found'));
    const res = await request(app.getHttpServer()).get(`${base}/${clientId}`).set('Authorization', 'Bearer owner-token').expect(404);
    expect(res.body.message ?? res.body.data?.message).toBe('Client not found');
  });

  it('requires a token', async () => {
    await request(app.getHttpServer()).get(base).expect(401);
  });

  it('is owner-only', async () => {
    await request(app.getHttpServer()).get(base).set('Authorization', 'Bearer client-token').expect(403);
    expect(service.list).not.toHaveBeenCalled();
  });
});
