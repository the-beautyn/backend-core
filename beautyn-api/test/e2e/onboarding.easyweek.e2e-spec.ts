import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { EasyWeekDiscoveryClient } from '../../src/onboarding/clients/easyweek-discovery.client';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { ACCOUNT_REGISTRY_REPOSITORY } from '@crm/account-registry';
import { TOKEN_STORAGE_REPOSITORY } from '@crm/token-storage';

describe('Onboarding EasyWeek (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockJwtGuard = {
      canActivate: jest.fn().mockImplementation((context) => {
        const req = context.switchToHttp().getRequest();
        const auth = req.headers.authorization;
        if (!auth || !auth.startsWith('Bearer ')) {
          throw new UnauthorizedException();
        }
        req.user = { id: 'user-1' };
        return true;
      }),
    };

    const mockEw = {
      listLocations: jest.fn().mockResolvedValue([
        { uuid: '11111111-1111-4111-8111-111111111111', name: 'Salon 1' },
      ]),
    };

    // Minimal Prisma mock to satisfy linkEasyWeek path
    const prismaMock: Partial<PrismaService> = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      onboardingStep: { upsert: jest.fn().mockResolvedValue(undefined) } as any,
      salon: {
        findFirst: jest.fn().mockResolvedValue(null),
        delete: jest.fn().mockResolvedValue(undefined),
        create: jest.fn().mockResolvedValue({ id: 'salon-1' }),
      } as any,
    };

    // In-memory repos for CRM modules to avoid hitting real Prisma tables
    const memAccounts = new (class {
      private store = new Map<string, any>();
      private key(s: string, p: string) { return `${s}|${p}`; }
      async find(salonId: string, provider: string) { return this.store.get(this.key(salonId, provider)) ?? null; }
      async upsert(payload: any) { this.store.set(this.key(payload.salonId, payload.provider), { ...payload }); }
    })();
    const memTokens = new (class {
      private store = new Map<string, any>();
      private key(s: string, p: string) { return `${s}|${p}`; }
      async findUnique(salonId: string, provider: string) { return this.store.get(this.key(salonId, provider)) ?? null; }
      async upsert(data: any) { this.store.set(this.key(data.salonId, data.provider), { ...data, id: 'id' }); }
      async delete(salonId: string, provider: string) { this.store.delete(this.key(salonId, provider)); }
    })();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideProvider(EasyWeekDiscoveryClient)
      .useValue(mockEw)
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(ACCOUNT_REGISTRY_REPOSITORY)
      .useValue(memAccounts as any)
      .overrideProvider(TOKEN_STORAGE_REPOSITORY)
      .useValue(memTokens as any)
      .compile();

    app = moduleFixture.createNestApplication();
    const ti = app.get(TransformInterceptor);
    app.useGlobalInterceptors(ti);
    // Mirror the production global pipe (main.ts) so DTO validation actually runs.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/onboarding/easyweek/discover without JWT returns 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/onboarding/easyweek/discover')
      .send({})
      .expect(401);
  });

  it('POST /api/v1/onboarding/easyweek/discover with JWT returns salons', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/onboarding/easyweek/discover')
      .set('Authorization', 'Bearer valid')
      .send({ auth_token: 't', workspace_slug: 'ws' })
      .expect(200);
    expect(res.body).toEqual({
      success: true,
      data: { salons: [{ uuid: '11111111-1111-4111-8111-111111111111', name: 'Salon 1' }] },
    });
  });

  it('POST /api/v1/onboarding/easyweek/connect without JWT returns 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/onboarding/easyweek/connect')
      .send({})
      .expect(401);
  });

  it('POST /api/v1/onboarding/easyweek/connect with JWT returns success', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/onboarding/easyweek/connect')
      .set('Authorization', 'Bearer valid')
      .send({ auth_token: 't', workspace_slug: 'ws', salons: [{ uuid: '11111111-1111-4111-8111-111111111111' }] })
      .expect(202);
    expect(res.body).toEqual({ success: true });
  });

  it('POST /api/v1/onboarding/easyweek/connect stores per-salon widget_url with derived fallback', async () => {
    const prisma = app.get(PrismaService);
    (prisma.salon.create as jest.Mock).mockClear();
    await request(app.getHttpServer())
      .post('/api/v1/onboarding/easyweek/connect')
      .set('Authorization', 'Bearer valid')
      .send({
        auth_token: 't',
        workspace_slug: 'ws',
        salons: [
          { uuid: '11111111-1111-4111-8111-111111111111', widget_url: 'https://booking.example.com/salon-1' },
          { uuid: '22222222-2222-4222-8222-222222222222' },
        ],
      })
      .expect(202);
    const creates = (prisma.salon.create as jest.Mock).mock.calls.map(([arg]) => arg.data);
    expect(creates).toEqual([
      expect.objectContaining({ bookingUrl: 'https://booking.example.com/salon-1' }),
      expect.objectContaining({ bookingUrl: 'https://booking.easyweek.com.ua/ws' }),
    ]);
  });

  it('POST /api/v1/onboarding/easyweek/connect rejects legacy salon_uuids payload', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/onboarding/easyweek/connect')
      .set('Authorization', 'Bearer valid')
      .send({ auth_token: 't', workspace_slug: 'ws', salon_uuids: ['11111111-1111-4111-8111-111111111111'] })
      .expect(400);
  });
});
