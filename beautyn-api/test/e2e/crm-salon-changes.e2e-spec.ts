import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, BadRequestException } from '@nestjs/common';
import request from 'supertest';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';
import { Reflector } from '@nestjs/core';
import { CrmSalonChangesController } from '../../src/api-gateway/v1/authenticated/crm-salon-changes.controller';
import { CrmSalonDiffService } from '../../src/crm-salon-changes/crm-salon-diff.service';
import { BrandService } from '../../src/brand/brand.service';

describe('CrmSalonChangesController (e2e)', () => {
  let app: INestApplication;
  const service = {
    listChanges: jest.fn(),
    acceptChange: jest.fn(),
    dismissChange: jest.fn(),
  } as unknown as jest.Mocked<CrmSalonDiffService>;
  const brandService = {
    assertUserCanAccessSalon: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<BrandService>;

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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [CrmSalonChangesController],
      providers: [
        { provide: CrmSalonDiffService, useValue: service },
        { provide: BrandService, useValue: brandService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/v1/crm/salon/changes returns list', async () => {
    service.listChanges.mockResolvedValueOnce([
      {
        id: 'c1',
        salonId: 'salon-1',
        provider: 'ALTEGIO',
        fieldPath: 'name',
        oldValue: 'Old',
        newValue: 'New',
        status: 'pending',
        detectedAt: new Date('2025-01-01T10:00:00Z'),
        decidedAt: null,
        decidedBy: null,
      } as any,
    ]);
    const res = await request(app.getHttpServer())
      .get('/api/v1/crm/salon/changes?salonId=salon-1')
      .set('Authorization', 'Bearer owner-token')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data[0].id).toBe('c1');
    expect(brandService.assertUserCanAccessSalon).toHaveBeenCalledWith('owner-1', 'salon-1');
    expect(service.listChanges).toHaveBeenCalledWith('salon-1', undefined);
  });

  it('GET /api/v1/crm/salon/changes validates query', async () => {
    service.listChanges.mockRejectedValueOnce(new BadRequestException('salonId required'));
    const res = await request(app.getHttpServer())
      .get('/api/v1/crm/salon/changes')
      .set('Authorization', 'Bearer owner-token')
      .expect(400);

    expect(res.body).toHaveProperty('message');
  });

  it('POST /api/v1/crm/salon/changes/:id/accept marks accepted', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/crm/salon/changes/proposal-1/accept')
      .set('Authorization', 'Bearer owner-token')
      .expect(201);

    expect(res.body.data).toEqual({ id: 'proposal-1', status: 'accepted' });
    expect(service.acceptChange).toHaveBeenCalledWith('proposal-1', 'owner-1');
  });

  it('POST /api/v1/crm/salon/changes/:id/dismiss marks dismissed', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/crm/salon/changes/proposal-2/dismiss')
      .set('Authorization', 'Bearer owner-token')
      .expect(201);

    expect(res.body.data).toEqual({ id: 'proposal-2', status: 'dismissed' });
    expect(service.dismissChange).toHaveBeenCalledWith('proposal-2', 'owner-1');
  });

  it('POST /api/v1/crm/salon/changes/:id/accept rejects non-owner role', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/crm/salon/changes/proposal-3/accept')
      .set('Authorization', 'Bearer client-token')
      .expect(403);
  });

  it('POST /api/v1/crm/salon/changes/:id/dismiss rejects non-owner role', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/crm/salon/changes/proposal-4/dismiss')
      .set('Authorization', 'Bearer client-token')
      .expect(403);
  });
});
