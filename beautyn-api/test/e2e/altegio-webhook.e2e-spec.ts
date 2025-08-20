import { createHmac } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AltegioWebhookController } from '../../src/api-gateway/v1/public/altegio-webhook.controller';
import { AltegioWebhookService } from '../../src/crm-integration/webhooks/altegio-webhook.service';
import { CrmIntegrationService } from '../../src/crm-integration/core/crm-integration.service';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { OnboardingService } from '../../src/onboarding/onboarding.service';

describe('Altegio connect webhook (e2e)', () => {
  let app: INestApplication;
  const token = { id: '1', token: 'token1', salonId: 'salon1', used: false, expiresAt: new Date(Date.now() + 1000) };

  beforeAll(async () => {
    process.env.ALTEGIO_WEBHOOK_SECRET = 'secret';
    const prisma = {
      $connect: jest.fn(),
      $disconnect: jest.fn(),
      crmLinkToken: {
        findFirst: jest.fn(async ({ where }: any) => {
          if (
            where.token === token.token &&
            where.provider === 'ALTEGIO' &&
            token.used === false &&
            token.expiresAt > new Date()
          ) {
            return { ...token };
          }
          return null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          if (where.id === token.id) token.used = data.used;
          return { ...token };
        }),
      },
    } as any;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AltegioWebhookController],
      providers: [AltegioWebhookService, CrmIntegrationService, OnboardingService],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(CrmIntegrationService)
      .useValue({ linkAltegio: jest.fn(), enqueueInitialSync: jest.fn() })
      .overrideProvider(OnboardingService)
      .useValue({ markCrmLinked: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns ok on valid request', () => {
    const raw = 'data';
    const sig = createHmac('sha256', 'secret').update(raw).digest('hex');
    const url = `/api/v1/webhooks/altegio/connect/${token.token}?salon_id=ext&user_data=${encodeURIComponent(
      raw,
    )}&user_data_sign=${sig}`;
    return request(app.getHttpServer()).get(url).expect(200).expect('ok');
  });

  it('returns 401 on bad signature', () => {
    const url = `/api/v1/webhooks/altegio/connect/${token.token}?salon_id=ext&user_data=raw&user_data_sign=bad`;
    return request(app.getHttpServer()).get(url).expect(401);
  });
});
