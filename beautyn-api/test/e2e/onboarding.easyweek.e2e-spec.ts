import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { JwtAuthGuard } from '../../src/shared/guards/jwt-auth.guard';
import { EasyWeekDiscoveryClient } from '../../src/onboarding/clients/easyweek-discovery.client';
import { TransformInterceptor } from '../../src/shared/interceptors/transform.interceptor';
import { PrismaService } from '../../src/shared/database/prisma.service';

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
        { uuid: 'ext-1', name: 'Salon 1' },
      ]),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideProvider(EasyWeekDiscoveryClient)
      .useValue(mockEw)
      .overrideProvider(PrismaService)
      .useValue({ $connect: jest.fn(), $disconnect: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    const ti = app.get(TransformInterceptor);
    app.useGlobalInterceptors(ti);
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
      data: { salons: [{ uuid: 'ext-1', name: 'Salon 1' }] },
    });
  });

  it('POST /api/v1/onboarding/connect/easyweek without JWT returns 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/onboarding/connect/easyweek')
      .send({})
      .expect(401);
  });

  it('POST /api/v1/onboarding/connect/easyweek with JWT returns job id', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/onboarding/connect/easyweek')
      .set('Authorization', 'Bearer valid')
      .send({ auth_token: 't', workspace_slug: 'ws', salon_uuid: 'ext-1' })
      .expect(202);
    expect(res.body).toEqual({ success: true, data: { job_id: 'job_dev_noop' } });
  });
});
