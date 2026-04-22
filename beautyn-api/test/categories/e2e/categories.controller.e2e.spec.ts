import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException, UnauthorizedException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import request from 'supertest';
import { CategoriesService } from '../../../src/categories/categories.service';
import { CategoriesPublicController } from '../../../src/api-gateway/v1/public/categories.controller';
import { CategoriesAuthenticatedController } from '../../../src/api-gateway/v1/authenticated/categories.controller';
import { CategoriesInternalController } from '../../../src/api-gateway/v1/internal/categories.internal.controller';
import { JwtAuthGuard } from '../../../src/shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../src/shared/guards/roles.guard';
import { SalonAccessGuard } from '../../../src/brand/guards/salon-access.guard';
import { InternalApiKeyGuard } from '../../../src/shared/guards/internal-api-key.guard';
import { TransformInterceptor } from '../../../src/shared/interceptors/transform.interceptor';

describe('CategoriesController (e2e)', () => {
  let app: INestApplication;
  const service = {
    listPublic: jest.fn(),
    pullFromDb: jest.fn(),
    pullFromCrm: jest.fn(),
    rebaseFromCrm: jest.fn(),
    rebaseFromCrmAsync: jest.fn(),
    syncFromCrm: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<CategoriesService>;

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

  const mockSalonAccessGuard = {
    canActivate: jest.fn().mockReturnValue(true),
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesPublicController, CategoriesAuthenticatedController, CategoriesInternalController],
      providers: [{ provide: CategoriesService, useValue: service }],
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

  it('GET /api/v1/categories returns list for salon', async () => {
    service.listPublic.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    const res = await request(app.getHttpServer())
      .get('/api/v1/categories?salonId=11111111-1111-1111-1111-111111111111')
      .expect(200);

    expect(res.body).toEqual({ success: true, data: { items: [], page: 1, limit: 20, total: 0 } });
    expect(service.listPublic).toHaveBeenCalledWith(expect.objectContaining({ salonId: '11111111-1111-1111-1111-111111111111' }));
  });

  it('GET /api/v1/salons/:salonId/categories without token is unauthorized', async () => {
    await request(app.getHttpServer()).get('/api/v1/salons/salon-1/categories').expect(401);
  });

  it('GET /api/v1/salons/:salonId/categories with owner token returns data', async () => {
    service.pullFromDb.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    const res = await request(app.getHttpServer())
      .get('/api/v1/salons/salon-1/categories')
      .set('Authorization', 'Bearer owner-token')
      .expect(200);

    expect(res.body).toEqual({ success: true, data: { items: [], page: 1, limit: 20, total: 0 } });
    expect(service.pullFromDb).toHaveBeenCalledWith('salon-1', expect.objectContaining({}));
  });

  it('GET /api/v1/categories without salonId returns 400', async () => {
    service.listPublic.mockRejectedValue(new BadRequestException('salonId is required'));

    const res = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(400);
    expect(res.body).toHaveProperty('message');
  });

  it('POST /api/v1/salons/:salonId/categories rejects non-owner role', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/salons/salon-1/categories')
      .set('Authorization', 'Bearer client-token')
      .send({ title: 'VIP' })
      .expect(403);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/salons/:salonId/categories creates category for owner', async () => {
    service.create.mockResolvedValue({
      id: 'cat-1',
      salon_id: 'salon-1',
      crm_category_id: '123',
      name: 'VIP',
      color: null,
      sort_order: null,
      service_ids: [],
      created_at: '2024-01-01T00:00:00.000Z' as unknown as Date,
      updated_at: '2024-01-01T00:00:00.000Z' as unknown as Date,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/salons/salon-1/categories')
      .set('Authorization', 'Bearer owner-token')
      .send({ title: 'VIP', weight: 1, staff: [1, 2] })
      .expect(201);

    expect(service.create).toHaveBeenCalledWith('salon-1', { title: 'VIP', weight: 1, staff: [1, 2] });
    expect(res.body.success).toBe(true);
  });

  it('GET /api/v1/salons/:salonId/categories/crm returns CRM page for owner', async () => {
    service.pullFromCrm.mockResolvedValue({ items: [], fetched: 0, total: 0, nextCursor: undefined });
    const res = await request(app.getHttpServer())
      .get('/api/v1/salons/salon-1/categories/crm')
      .set('Authorization', 'Bearer owner-token')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(service.pullFromCrm).toHaveBeenCalledWith('salon-1');
  });

  it('POST /api/v1/salons/:salonId/categories/crm/sync returns sync result', async () => {
    service.rebaseFromCrm.mockResolvedValue({ categories: [], upserted: 0, deleted: 0 });
    const res = await request(app.getHttpServer())
      .post('/api/v1/salons/salon-1/categories/crm/sync')
      .set('Authorization', 'Bearer owner-token')
      .expect(201);
    expect(res.body.success).toBe(true);
    expect(service.rebaseFromCrm).toHaveBeenCalledWith('salon-1');
  });

  it('POST /api/v1/salons/:salonId/categories/crm/sync/async returns 202 and jobId', async () => {
    service.rebaseFromCrmAsync.mockResolvedValue({ jobId: 'job-1' });
    const res = await request(app.getHttpServer())
      .post('/api/v1/salons/salon-1/categories/crm/sync/async')
      .set('Authorization', 'Bearer owner-token')
      .expect(202);
    expect(res.body.success).toBe(true);
    expect(res.body.data.jobId).toBe('job-1');
  });

  it('PATCH /api/v1/salons/:salonId/categories/:id updates category', async () => {
    service.update.mockResolvedValue({ id: 'cat-1', name: 'New', crmCategoryId: '123' } as any);
    const res = await request(app.getHttpServer())
      .patch('/api/v1/salons/salon-1/categories/cat-1')
      .set('Authorization', 'Bearer owner-token')
      .send({ title: 'New' })
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(service.update).toHaveBeenCalledWith('salon-1', 'cat-1', { title: 'New' });
  });

  it('PATCH /api/v1/salons/:salonId/categories/:id returns 409 on conflict', async () => {
    service.update.mockRejectedValue(new ConflictException('Category has linked services'));
    await request(app.getHttpServer())
      .patch('/api/v1/salons/salon-1/categories/cat-1')
      .set('Authorization', 'Bearer owner-token')
      .send({ title: 'New' })
      .expect(409);
  });

  it('DELETE /api/v1/salons/:salonId/categories/:id returns 204 on success', async () => {
    service.delete.mockResolvedValue(undefined);
    await request(app.getHttpServer())
      .delete('/api/v1/salons/salon-1/categories/cat-1')
      .set('Authorization', 'Bearer owner-token')
      .expect(204);
  });

  it('DELETE /api/v1/salons/:salonId/categories/:id returns 404 when missing', async () => {
    service.delete.mockRejectedValue(new NotFoundException());
    await request(app.getHttpServer())
      .delete('/api/v1/salons/salon-1/categories/cat-1')
      .set('Authorization', 'Bearer owner-token')
      .expect(404);
  });

  it('POST /api/v1/internal/categories/sync requires valid key', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/internal/categories/sync')
      .send({ salon_id: 's', categories: [] })
      .expect(401);

    service.syncFromCrm.mockResolvedValue({ upserted: 0, deleted: 0, categories: [] } as any);
    const res = await request(app.getHttpServer())
      .post('/api/v1/internal/categories/sync')
      .set('x-internal-key', 'good-key')
      .send({ salon_id: 's', categories: [] })
      .expect(200);
    expect(res.body.success).toBe(true);
  });
});
