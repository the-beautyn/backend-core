import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { execSync } from 'node:child_process';
import { createTestApp } from '../test-utils/create-test-app';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = 'file:./test.db?connection_limit=1&mode=memory';
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/register → 201', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'e2e@example.com', password: 'pass' })
      .expect(201);
  });

  it('POST /api/v1/auth/login → 200', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e@example.com', password: 'pass' })
      .expect(200);
    accessToken = res.body.accessToken;
    expect(accessToken).toBeDefined();
  });

  it('GET /api/health → 200', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('POST /api/v1/auth/logout → 204', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);
  });

  it('GET /api/health again → 401', async () => {
    await request(app.getHttpServer())
      .get('/api/health')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });
});
