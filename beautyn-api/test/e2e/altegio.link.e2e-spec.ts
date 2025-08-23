import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';
import { AltegioPartnerClient } from '../../src/crm-integration/clients/altegio-partner.client';

describe('Altegio linking (e2e)', () => {
  let app: INestApplication;
  let prismaMock: any;
  const userId = 'user-1';

  beforeAll(async () => {
    process.env.PAIRING_CODE_PEPPER = 'test-pepper';

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

    // In-memory prisma mock
    const pairingCodes: any[] = [];
    prismaMock = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      crmPairingCode: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const row = { id: String(pairingCodes.length + 1), attempts: 0, usedAt: null, ...data };
          pairingCodes.push(row);
          return Promise.resolve(row);
        }),
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          return Promise.resolve(
            pairingCodes.find((r) => r.provider === where.provider && r.codeHash === where.codeHash) || null,
          );
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = pairingCodes.findIndex((r) => r.id === where.id);
          if (idx >= 0) pairingCodes[idx] = { ...pairingCodes[idx], ...data };
          return Promise.resolve(pairingCodes[idx]);
        }),
      },
      onboardingStep: {
        upsert: jest.fn().mockResolvedValue(undefined),
      },
    } as Partial<PrismaService> as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(AltegioPartnerClient)
      .useValue({ confirmRegistration: jest.fn().mockResolvedValue(undefined) })
      .compile();

    app = moduleFixture.createNestApplication();
    const ti = app.get(TransformInterceptor);
    app.useGlobalInterceptors(ti);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('pair-code -> redirect -> confirm links Altegio CRM', async () => {
    // Generate pair code
    const pc = await request(app.getHttpServer())
      .post('/api/v1/onboarding/altegio/pair-code')
      .set('Authorization', 'Bearer valid')
      .send({})
      .expect(201);

    expect(pc.body.success).toBe(true);
    const code: string = pc.body.data.code;

    // Get redirect page
    const rd = await request(app.getHttpServer())
      .get('/api/v1/webhooks/altegio/redirect')
      .query({ salon_id: '1234' })
      .expect(200);
    expect(String(rd.text || '')).toContain('<form');

    // Confirm with code
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/altegio/confirm')
      .send({ code, salon_id: '1234' })
      .expect(201)
      .expect({ success: true });

    // Ensure onboarding marked as linked
    expect(prismaMock.onboardingStep.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    );
  });
});


