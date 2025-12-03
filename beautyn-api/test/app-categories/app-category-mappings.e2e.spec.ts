import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';
import { AppCategoryMappingsController } from '../../src/api-gateway/v1/authenticated/app-category-mappings.controller';
import { SalonCategoryMappingsService } from '../../src/app-categories/salon-category-mappings.service';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../src/shared/guards/roles.guard';
import { CategoryOwnerGuard } from '../../src/categories/guards/category-owner.guard';

describe('AppCategoryMappingsController (e2e)', () => {
  let app: INestApplication;
  const mappingsService = {
    find: jest.fn(),
    upsert: jest.fn(),
  } as unknown as jest.Mocked<SalonCategoryMappingsService>;

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
      controllers: [AppCategoryMappingsController],
      providers: [{ provide: SalonCategoryMappingsService, useValue: mappingsService }],
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

  it('GET /api/v1/app-categories/mappings/:id returns mapping for owner', async () => {
    const mapping = {
      salonCategoryId: 'cat-1',
      appCategoryId: 'app-1',
      autoMatched: false,
      confidence: 0.9,
      updatedBy: 'owner',
      updatedAt: new Date().toISOString(),
    };
    mappingsService.find.mockResolvedValue(mapping as any);

    const res = await request(app.getHttpServer())
      .get('/api/v1/app-categories/mappings/cat-1')
      .set('Authorization', 'Bearer owner-token')
      .expect(200);

    expect(res.body).toEqual({ success: true, data: mapping });
    expect(mappingsService.find).toHaveBeenCalledWith('cat-1');
  });

  it('PATCH /api/v1/app-categories/mappings/:id assigns app category for owner', async () => {
    const mapping = {
      salonCategoryId: 'cat-2',
      appCategoryId: 'app-2',
      autoMatched: false,
      confidence: null,
      updatedBy: 'owner',
      updatedAt: new Date().toISOString(),
    };
    mappingsService.upsert.mockResolvedValue(mapping as any);

    const res = await request(app.getHttpServer())
      .patch('/api/v1/app-categories/mappings/cat-2')
      .set('Authorization', 'Bearer owner-token')
      .send({ appCategoryId: 'app-2' })
      .expect(200);

    expect(res.body).toEqual({ success: true, data: mapping });
    expect(mappingsService.upsert).toHaveBeenCalledWith('cat-2', { appCategoryId: 'app-2' }, 'owner');
  });

  it('PATCH /api/v1/app-categories/mappings/:id without token is unauthorized', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/app-categories/mappings/cat-2')
      .send({ appCategoryId: 'app-2' })
      .expect(401);
  });
});
