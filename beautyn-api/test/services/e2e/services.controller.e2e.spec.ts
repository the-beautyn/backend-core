import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, ForbiddenException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { ServicesService } from '../../../src/services/services.service';
import { ServicesController } from '../../../src/api-gateway/v1/public/services.controller';
import { ServicesAuthenticatedController } from '../../../src/api-gateway/v1/authenticated/services.controller';
import { ServicesInternalController } from '../../../src/api-gateway/v1/internal/services.internal.controller';
import { JwtAuthGuard } from '../../../src/shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../src/shared/guards/roles.guard';
import { InternalApiKeyGuard } from '../../../src/shared/guards/internal-api-key.guard';
import { TransformInterceptor } from '../../../src/shared/interceptors/transform.interceptor';
import { SalonAccessGuard } from '../../../src/brand/guards/salon-access.guard';

describe('ServicesController (e2e)', () => {
  let app: INestApplication;
  const service = {
    listPublic: jest.fn(),
    pullFromDb: jest.fn(),
    pullFromCrm: jest.fn(),
    rebaseFromCrm: jest.fn(),
    rebaseFromCrmAsync: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    syncFromCrm: jest.fn(),
  } as unknown as jest.Mocked<ServicesService>;

  const mockJwtGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        throw new UnauthorizedException();
      }
      const token = auth.slice(7);
      if (token === 'owner-token') {
        req.user = { id: 'owner-1', role: 'owner' };
        return true;
      }
      if (token === 'client-token') {
        req.user = { id: 'client-1', role: 'client' };
        return true;
      }
      throw new UnauthorizedException();
    }),
  };

  const mockOwnerRolesGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      if (req.user?.role !== 'owner') {
        throw new ForbiddenException();
      }
      return true;
    }),
  };

  const mockInternalApiKeyGuard = {
    canActivate: jest.fn().mockImplementation((context) => {
      const req = context.switchToHttp().getRequest();
      const key = req.headers['x-internal-key'];
      if (key !== 'good-key') {
        throw new UnauthorizedException();
      }
      return true;
    }),
  };

  const mockSalonAccessGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ServicesController, ServicesAuthenticatedController, ServicesInternalController],
      providers: [{ provide: ServicesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideGuard(OwnerRolesGuard)
      .useValue(mockOwnerRolesGuard)
      .overrideGuard(SalonAccessGuard)
      .useValue(mockSalonAccessGuard)
      .overrideGuard(InternalApiKeyGuard)
      .useValue(mockInternalApiKeyGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalInterceptors(new TransformInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/services returns public list', async () => {
    service.listPublic.mockResolvedValue({ items: [], page: 1, limit: 50, total: 0 });
    const res = await request(app.getHttpServer())
      .get('/api/v1/services?salonId=11111111-1111-1111-1111-111111111111')
      .expect(200);
    expect(res.body).toEqual({ success: true, data: { items: [], page: 1, limit: 50, total: 0 } });
  });

  it('GET /api/v1/services without salonId returns 400', async () => {
    service.listPublic.mockRejectedValue(new BadRequestException('salonId is required'));
    const res = await request(app.getHttpServer())
      .get('/api/v1/services')
      .expect(400);
    expect(res.body).toHaveProperty('message');
  });

  it('GET /api/v1/salons/:salonId/services returns owner list', async () => {
    service.pullFromDb.mockResolvedValue({ items: [], page: 1, limit: 50, total: 0 });
    const res = await request(app.getHttpServer())
      .get('/api/v1/salons/salon-1/services')
      .set('Authorization', 'Bearer owner-token')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(service.pullFromDb).toHaveBeenCalledWith('salon-1', expect.any(Object));
  });

  it('GET /api/v1/salons/:salonId/services/crm returns CRM page', async () => {
    service.pullFromCrm.mockResolvedValue({ items: [], fetched: 0, total: 0, nextCursor: undefined } as any);
    const res = await request(app.getHttpServer())
      .get('/api/v1/salons/salon-1/services/crm')
      .set('Authorization', 'Bearer owner-token')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(service.pullFromCrm).toHaveBeenCalledWith('salon-1');
  });

  it('POST /api/v1/salons/:salonId/services/crm/sync returns sync result', async () => {
    service.rebaseFromCrm.mockResolvedValue({ services: [], upserted: 0, deleted: 0 } as any);
    const res = await request(app.getHttpServer())
      .post('/api/v1/salons/salon-1/services/crm/sync')
      .set('Authorization', 'Bearer owner-token')
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(service.rebaseFromCrm).toHaveBeenCalledWith('salon-1');
  });

  it('POST /api/v1/salons/:salonId/services/crm/sync/async returns 202 and jobId', async () => {
    service.rebaseFromCrmAsync.mockResolvedValue({ jobId: 'job-1' });
    const res = await request(app.getHttpServer())
      .post('/api/v1/salons/salon-1/services/crm/sync/async')
      .set('Authorization', 'Bearer owner-token')
      .expect(202);
    expect(res.body.data.jobId).toBe('job-1');
  });

  it('POST /api/v1/internal/services/sync requires valid key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/internal/services/sync')
      .send({ salon_id: 's', services: [] })
      .expect(401);

    service.syncFromCrm.mockResolvedValue({ upserted: 0, deleted: 0, services: [] } as any);
    const res = await request(app.getHttpServer())
      .post('/api/v1/internal/services/sync')
      .set('x-internal-key', 'good-key')
      .send({ salon_id: 's', services: [] })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});

