import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/database/prisma.service';
import { TransformInterceptor } from '../src/shared/interceptors/transform.interceptor';
import { JwtAuthGuard } from '../src/shared/guards/jwt-auth.guard';

describe('Brand (e2e)', () => {
  let app: INestApplication;
  const userId = '123e4567-e89b-12d3-a456-426614174111';

  const brands: any[] = [];
  const brandMembers: any[] = [];
  const salons: any[] = [];
  const steps: any[] = [];

  const prismaMock: Partial<PrismaService> = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn().mockImplementation(async (cb: any) => cb(prismaMock)),
    brand: {
      create: jest.fn().mockImplementation(({ data }: any) => {
        const now = new Date();
        const row = { id: randomUUID(), name: data.name, createdAt: now, updatedAt: now };
        brands.push(row);
        return row;
      }),
      findMany: jest.fn().mockImplementation(({ where }: any) => {
        const memberIds = brandMembers.filter((m) => m.userId === where?.members?.some?.userId).map((m) => m.brandId);
        return brands
          .filter((b) => memberIds.includes(b.id))
          .map((b) => ({
            ...b,
            _count: { salons: salons.filter((s) => s.brandId === b.id && s.deletedAt == null).length },
          }));
      }),
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        const brand = brands.find((b) => b.id === where?.id);
        if (!brand) return null;
        return {
          ...brand,
          _count: { salons: salons.filter((s) => s.brandId === brand.id && s.deletedAt == null).length },
        };
      }),
      update: jest.fn().mockImplementation(({ where, data }: any) => {
        const idx = brands.findIndex((b) => b.id === where.id);
        if (idx < 0) throw new Error('Brand not found');
        brands[idx] = { ...brands[idx], ...data, updatedAt: new Date() };
        return brands[idx];
      }),
    } as any,
    brandMember: {
      create: jest.fn().mockImplementation(({ data }: any) => {
        const row = { id: randomUUID(), ...data, createdAt: new Date(), updatedAt: new Date() };
        brandMembers.push(row);
        return row;
      }),
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        return brandMembers.find((m) => m.userId === where?.userId && m.brandId === where?.brandId) || null;
      }),
      update: jest.fn().mockImplementation(({ where, data }: any) => {
        const idx = brandMembers.findIndex((m) => m.brandId === where?.brandId_userId?.brandId && m.userId === where?.brandId_userId?.userId);
        if (idx < 0) throw new Error('Membership not found');
        brandMembers[idx] = { ...brandMembers[idx], ...data, updatedAt: new Date() };
        return brandMembers[idx];
      }),
    } as any,
    salon: {
      findMany: jest.fn().mockImplementation(({ where }: any) => {
        return salons.filter((s) => s.brandId === where?.brandId && s.deletedAt == null);
      }),
      findFirst: jest.fn().mockImplementation(({ where }: any) => {
        return (
          salons
            .filter((s) => s.ownerUserId === where?.ownerUserId && s.deletedAt == null)
            .sort((a, b) => Number(a.createdAt) - Number(b.createdAt))[0] ?? null
        );
      }),
      updateMany: jest.fn().mockImplementation(({ where, data }: any) => {
        let count = 0;
        salons.forEach((s, index) => {
          const matchBrand = where.brandId === null ? s.brandId == null : s.brandId === where.brandId;
          if (s.ownerUserId === where.ownerUserId && matchBrand) {
            salons[index] = { ...s, ...data };
            count++;
          }
        });
        return { count };
      }),
      findUnique: jest.fn().mockImplementation(({ where, select }: any) => {
        const salon = salons.find((s) => s.id === where?.id) || null;
        if (!salon || !select) return salon;
        const out: any = {};
        Object.keys(select).forEach((key) => {
          out[key] = (salon as any)[key];
        });
        return out;
      }),
    } as any,
    onboardingStep: {
      findUnique: jest.fn().mockImplementation(({ where }: any) => steps.find((s) => s.userId === where.userId) || null),
      create: jest.fn().mockImplementation(({ data }: any) => {
        const row = { crmConnected: false, brandCreated: false, subscriptionSet: false, completed: false, currentStep: 'CRM', ...data };
        steps.push(row);
        return row;
      }),
      updateMany: jest.fn().mockImplementation(({ where, data }: any) => {
        let count = 0;
        for (let i = 0; i < steps.length; i++) {
          if (steps[i].userId === where.userId && steps[i].currentStep === where.currentStep) {
            steps[i] = { ...steps[i], ...data };
            count++;
          }
        }
        return { count };
      }),
    } as any,
  };

  beforeAll(async () => {
    const mockJwtGuard = {
      canActivate: jest.fn().mockImplementation((context) => {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
          throw new UnauthorizedException();
        }
        req.user = { id: userId };
        return true;
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    const ti = app.get(TransformInterceptor);
    app.useGlobalInterceptors(ti);
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    brands.length = 0;
    brandMembers.length = 0;
    salons.length = 0;
    steps.length = 0;
  });

  it('GET /api/v1/brand/my without JWT returns 401', () => {
    return request(app.getHttpServer())
      .get('/api/v1/brand/my')
      .expect(401);
  });

  it('GET /api/v1/brand/my with no brands returns 404', () => {
    return request(app.getHttpServer())
      .get('/api/v1/brand/my')
      .set('Authorization', 'Bearer valid')
      .expect(404);
  });

  it('creates brand, advances onboarding, and returns brand', async () => {
    const preSalonId = randomUUID();
    salons.push({
      id: preSalonId,
      brandId: null,
      ownerUserId: userId,
      name: 'Pre Salon',
      addressLine: 'Line 0',
      city: 'Kyiv',
      provider: 'EASYWEEK',
      externalSalonId: 'loc-pre',
      deletedAt: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    steps.push({
      userId,
      crmConnected: true,
      brandCreated: false,
      subscriptionSet: false,
      completed: false,
      currentStep: 'BRAND',
    });

    const createRes = await request(app.getHttpServer())
      .post('/api/v1/brand')
      .set('Authorization', 'Bearer valid')
      .send({ name: 'Acme' })
      .expect(201);

    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.name).toBe('Acme');

    const brandId = createRes.body.data.id;
    salons.push({
      id: randomUUID(),
      brandId,
      name: 'Salon A',
      addressLine: 'Line 1',
      city: 'Kyiv',
      provider: 'EASYWEEK',
      externalSalonId: 'loc-1',
      deletedAt: null,
      createdAt: new Date(),
    });

    const listRes = await request(app.getHttpServer())
      .get('/api/v1/brand/my')
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data.name).toBe('Acme');

    const salonsRes = await request(app.getHttpServer())
      .get(`/api/v1/brand/${brandId}/salons`)
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(salonsRes.body.success).toBe(true);
    expect(salonsRes.body.data).toHaveLength(2);
    expect(salonsRes.body.data[1]).toMatchObject({
      id: salons[1].id,
      name: 'Salon A',
      city: 'Kyiv',
      provider: 'EASYWEEK',
    });

    const memberRes = await request(app.getHttpServer())
      .get(`/api/v1/brand/${brandId}/member`)
      .set('Authorization', 'Bearer valid')
      .expect(200);
    expect(memberRes.body.success).toBe(true);
    expect(memberRes.body.data.last_selected_salon_id).toBe(preSalonId);

    const selectRes = await request(app.getHttpServer())
      .put(`/api/v1/brand/${brandId}/selected-salon`)
      .set('Authorization', 'Bearer valid')
      .send({ salon_id: salons[1].id })
      .expect(200);
    expect(selectRes.body.success).toBe(true);
    expect(selectRes.body.data.last_selected_salon_id).toBe(salons[1].id);

    const progressRes = await request(app.getHttpServer())
      .get('/api/v1/onboarding/progress')
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(progressRes.body).toMatchObject({
      success: true,
      data: {
        crm_connected: true,
        brand_created: true,
        current_step: 'SUBSCRIPTION',
      },
    });
  });
});
