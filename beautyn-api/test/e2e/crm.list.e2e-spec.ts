import { Test } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';

describe('CRM List (e2e)', () => {
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

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    const ti = app.get(TransformInterceptor);
    app.useGlobalInterceptors(ti);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/onboarding/crms returns providers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/onboarding/crms')
      .set('Authorization', 'Bearer valid')
      .expect(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.providers)).toBe(true);
    expect(res.body.data.providers.find((p: any) => p.code === 'EASYWEEK')).toBeTruthy();
    expect(res.body.data.providers.find((p: any) => p.code === 'ALTEGIO')).toBeTruthy();
  });

  it('GET /api/v1/onboarding/crms returns populated links per provider', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/onboarding/crms')
      .set('Authorization', 'Bearer valid')
      .expect(200);
    const easyweek = res.body.data.providers.find((p: any) => p.code === 'EASYWEEK');
    const altegio = res.body.data.providers.find((p: any) => p.code === 'ALTEGIO');
    expect(easyweek.links.external_url).toMatch(/^https?:\/\//);
    expect(easyweek.links.booking_instruction_url).toMatch(/^https?:\/\//);
    expect(altegio.links.external_url).toMatch(/^https?:\/\//);
  });

  it('GET /api/v1/onboarding/crms/:code is case-insensitive', async () => {
    for (const code of ['EASYWEEK', 'easyweek', 'Altegio']) {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/onboarding/crms/${code}`)
        .set('Authorization', 'Bearer valid')
        .expect(200);
      expect(res.body.data.code).toBe(code.toUpperCase());
      expect(res.body.data.links.external_url).toMatch(/^https?:\/\//);
    }
  });

  it('GET /api/v1/onboarding/crms/:code returns 404 for unknown provider', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/onboarding/crms/unknown')
      .set('Authorization', 'Bearer valid')
      .expect(404);
  });
});
