import { Test } from '@nestjs/testing';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { corsOptionsFromConfig } from '../../src/shared/utils/cors-options.util';

const ALLOWED_ORIGIN = 'https://panel.example.com';
const DISALLOWED_ORIGIN = 'https://evil.example.com';

@Controller('api/v1/cors-check')
class CorsCheckController {
  @Get()
  check() {
    return { ok: true };
  }
}

describe('CORS (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [CorsCheckController],
    }).compile();

    app = moduleFixture.createNestApplication();
    const config = {
      get: (key: string) =>
        ({ CORS_ALLOWED_ORIGINS: ALLOWED_ORIGIN, NODE_ENV: 'production' })[key],
    } as unknown as ConfigService;
    app.enableCors(corsOptionsFromConfig(config));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers preflight from an allowed origin, permitting Authorization', async () => {
    const res = await request(app.getHttpServer())
      .options('/api/v1/cors-check')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization')
      .expect(204);

    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    expect(res.headers['access-control-allow-headers']).toBe('Content-Type,Authorization');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('sends no CORS headers on preflight from a disallowed origin', async () => {
    const res = await request(app.getHttpServer())
      .options('/api/v1/cors-check')
      .set('Origin', DISALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('reflects the allowed origin on actual requests', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/cors-check')
      .set('Origin', ALLOWED_ORIGIN)
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  it('leaves requests without an Origin header untouched (curl, mobile apps)', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/cors-check').expect(200);

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
