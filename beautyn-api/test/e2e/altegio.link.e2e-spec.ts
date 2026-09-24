import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { PrismaService } from '../../src/shared/database/prisma.service';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';
import { AltegioPartnerClient } from '../../src/crm-integration/clients/altegio-partner.client';
import { ACCOUNT_REGISTRY_REPOSITORY } from '@crm/account-registry';
import { TOKEN_STORAGE_REPOSITORY } from '@crm/token-storage';

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
      $transaction: jest.fn((cb: any) => cb(prismaMock)),
      $executeRaw: jest.fn().mockResolvedValue(0),
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
        findMany: jest.fn().mockImplementation(({ where }: any) =>
          Promise.resolve(pairingCodes.filter((r) => r.provider === where.provider && r.codeHash === where.codeHash)),
        ),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = pairingCodes.findIndex((r) => r.id === where.id);
          if (idx >= 0) pairingCodes[idx] = { ...pairingCodes[idx], ...data };
          return Promise.resolve(pairingCodes[idx]);
        }),
        // The atomic claim: only a row whose usedAt is still null is taken.
        updateMany: jest.fn().mockImplementation(({ where, data }: any) => {
          const idx = pairingCodes.findIndex(
            (r) => r.id === where.id && ('usedAt' in where ? r.usedAt === where.usedAt : true),
          );
          if (idx < 0) return Promise.resolve({ count: 0 });
          pairingCodes[idx] = { ...pairingCodes[idx], ...data };
          return Promise.resolve({ count: 1 });
        }),
      },
      onboardingStep: {
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        upsert: jest.fn().mockResolvedValue(undefined),
      },
      salon: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'salon-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      // BEA-75: a salon linked after the brand exists must join it.
      brandMember: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    } as Partial<PrismaService> as any;

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
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(AltegioPartnerClient)
      .useValue({ confirmRegistration: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(ACCOUNT_REGISTRY_REPOSITORY)
      .useValue(memAccounts as any)
      .overrideProvider(TOKEN_STORAGE_REPOSITORY)
      .useValue(memTokens as any)
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
      .query({ salon_ids: ['1234'] })
      .expect(200);
    expect(String(rd.text || '')).toContain('<form');
    // Relative action: posts back over whatever scheme/host served the page,
    // never a req.protocol-derived http:// URL behind the TLS-ending proxies.
    expect(String(rd.text || '')).toContain(
      'action="/api/v1/webhooks/altegio/confirm"',
    );

    // Confirm with code
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/altegio/confirm')
      .send({ code, salon_ids: ['1234'] })
      .expect(201)
      .expect({ success: true });

    // Ensure onboarding marked as linked
    expect(prismaMock.onboardingStep.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    );
    // No brand yet: the salon is left for brand creation to pick up.
    expect(prismaMock.salon.updateMany).not.toHaveBeenCalled();
  });

  const pairCode = async () => {
    const pc = await request(app.getHttpServer())
      .post('/api/v1/onboarding/altegio/pair-code')
      .set('Authorization', 'Bearer valid')
      .send({})
      .expect(201);
    return pc.body.data.code as string;
  };

  it('a salon paired after the brand exists joins that brand', async () => {
    prismaMock.brandMember.findMany.mockResolvedValueOnce([{ brandId: 'brand-1' }]);
    const code = await pairCode();

    await request(app.getHttpServer())
      .post('/api/v1/webhooks/altegio/confirm')
      .send({ code, salon_ids: ['1234'] })
      .expect(201)
      .expect({ success: true });

    expect(prismaMock.salon.updateMany).toHaveBeenCalledWith({
      where: { id: 'salon-1', ownerUserId: userId, brandId: null },
      data: { brandId: 'brand-1' },
    });
    expect(prismaMock.brandMember.updateMany).toHaveBeenCalledWith({
      where: { brandId: 'brand-1', userId, lastSelectedSalonId: null, brand: { salons: { some: { id: 'salon-1' } } } },
      data: { lastSelectedSalonId: 'salon-1' },
    });
  });

  it('a failed link is not a success and does not advance onboarding', async () => {
    prismaMock.salon.create.mockRejectedValueOnce(new Error('db down'));
    prismaMock.onboardingStep.upsert.mockClear();
    const code = await pairCode();

    const res = await request(app.getHttpServer())
      .post('/api/v1/webhooks/altegio/confirm')
      .send({ code, salon_ids: ['1234'] })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(prismaMock.onboardingStep.upsert).not.toHaveBeenCalled();

    // The code was handed back: the same code links on the retry.
    await request(app.getHttpServer())
      .post('/api/v1/webhooks/altegio/confirm')
      .send({ code, salon_ids: ['1234'] })
      .expect(201)
      .expect({ success: true });
  });
});

