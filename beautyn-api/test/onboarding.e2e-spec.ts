import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/database/prisma.service';
import { TransformInterceptor } from '../src/shared/interceptors/transform.interceptor';
import { JwtAuthGuard } from '../src/shared/guards/jwt-auth.guard';

describe('Onboarding (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const userId = '123e4567-e89b-12d3-a456-426614174000';

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

    // In-memory prisma mock for this suite (avoid real DB/migrations)
    const users: any[] = [];
    const steps: any[] = [];
    const prismaMock: Partial<PrismaService> = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      users: {
        create: jest.fn().mockImplementation(({ data }: any) => { users.push({ ...data }); return { ...data }; }),
        deleteMany: jest.fn().mockImplementation(() => { users.length = 0; return { count: 0 }; }),
      } as any,
      onboardingStep: {
        findUnique: jest.fn().mockImplementation(({ where }: any) => steps.find((s) => s.userId === where.userId) || null),
        create: jest.fn().mockImplementation(({ data }: any) => { const row = { crmConnected: false, brandCreated: false, subscriptionSet: false, completed: false, currentStep: 'CRM', ...data }; steps.push(row); return row; }),
        deleteMany: jest.fn().mockImplementation(() => { steps.length = 0; return { count: 0 }; }),
        upsert: jest.fn().mockImplementation(({ where, create, update }: any) => {
          const idx = steps.findIndex((s) => s.userId === where.userId);
          if (idx >= 0) { steps[idx] = { ...steps[idx], ...(update || {}) }; return steps[idx]; }
          const row = { crmConnected: false, brandCreated: false, subscriptionSet: false, completed: false, currentStep: 'CRM', ...(create || {}), userId: where.userId };
          steps.push(row); return row;
        }),
      } as any,
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
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    // In-memory mock already isolates state; no real DB cleanup
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/onboarding/progress without JWT returns 401', () => {
    return request(app.getHttpServer())
      .get('/api/v1/onboarding/progress')
      .expect(401);
  });

  it('GET /api/v1/onboarding/progress with JWT returns progress', async () => {
    await prisma.users.create({
      data: { id: userId, email: 'test@example.com', role: 'owner' },
    });
    // No pre-seed; service will create the step on first call

    const res = await request(app.getHttpServer())
      .get('/api/v1/onboarding/progress')
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: {
        crm_connected: false,
        brand_created: false,
        subscription_set: false,
        completed: false,
        current_step: 'CRM',
      },
    });
  });
});
