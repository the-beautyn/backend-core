import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { execSync } from 'child_process';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = 'file:./test.db?connection_limit=1&mode=memory';
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRES_IN = '1h';
    execSync('npx prisma db push', { stdio: 'inherit', env: { ...process.env } });
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/register', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'e2e@example.com', password: 'pass', role: 'client' })
      .expect(201);
  });

  it('login, health, logout, health again', async () => {
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'e2e@example.com', password: 'pass' })
      .expect(200);
    accessToken = login.body.data.accessToken;

    await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(401);
  });
});
