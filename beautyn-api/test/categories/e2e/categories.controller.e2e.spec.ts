import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { CategoriesService } from '../../../src/categories/categories.service';
import { CategoriesPublicController } from '../../../src/api-gateway/v1/public/categories.controller';
import { CategoriesAuthenticatedController } from '../../../src/api-gateway/v1/authenticated/categories.controller';
import { JwtAuthGuard } from '../../../src/shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../src/shared/guards/roles.guard';
import { CategoryOwnerGuard } from '../../../src/categories/guards/category-owner.guard';
import { TransformInterceptor } from '../../../src/shared/interceptors/transform.interceptor';

describe('CategoriesController (e2e)', () => {
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

  const mockCategoryOwnerGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesPublicController, CategoriesAuthenticatedController],
      providers: [{ provide: CategoriesService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideGuard(OwnerRolesGuard)
      .useValue(mockOwnerRolesGuard)
      .overrideGuard(CategoryOwnerGuard)
      .useValue(mockCategoryOwnerGuard)
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

  it('GET /api/v1/categories/my without token is unauthorized', async () => {
    await request(app.getHttpServer()).get('/api/v1/categories/my').expect(401);
  });

  it('GET /api/v1/categories/my with owner token returns data', async () => {
    service.pullFromDb.mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 });

    const res = await request(app.getHttpServer())
      .get('/api/v1/categories/my')
      .set('Authorization', 'Bearer owner-token')
      .expect(200);

    expect(res.body).toEqual({ success: true, data: { items: [], page: 1, limit: 20, total: 0 } });
    expect(service.pullFromDb).toHaveBeenCalledWith('owner-1', expect.objectContaining({}));
  });

  it('POST /api/v1/categories rejects non-owner role', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', 'Bearer client-token')
      .send({ title: 'VIP' })
      .expect(403);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('POST /api/v1/categories creates category for owner', async () => {
    service.create.mockResolvedValue({
      id: 'cat-1',
      salonId: 'salon-1',
      crmExternalId: '123',
      name: 'VIP',
      color: null,
      sortOrder: null,
      createdAt: '2024-01-01T00:00:00.000Z' as unknown as Date,
      updatedAt: '2024-01-01T00:00:00.000Z' as unknown as Date,
    });

    const res = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', 'Bearer owner-token')
      .send({ title: 'VIP', weight: 1, staff: [1, 2] })
      .expect(201);

    expect(service.create).toHaveBeenCalledWith('owner-1', { title: 'VIP', weight: 1, staff: [1, 2] });
    expect(res.body.success).toBe(true);
  });
});
