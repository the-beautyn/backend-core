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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    const ti = app.get(TransformInterceptor);
    app.useGlobalInterceptors(ti);
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.onboardingStep.deleteMany();
    await prisma.users.deleteMany();
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
    // Seed onboarding step to avoid FK race in create path
    await prisma.onboardingStep.create({ data: { userId } });

    const res = await request(app.getHttpServer())
      .get('/api/v1/onboarding/progress')
      .set('Authorization', 'Bearer valid')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: {
        crm_connected: false,
        subscription_set: false,
        completed: false,
        current_step: 'CRM',
      },
    });
  });
});
