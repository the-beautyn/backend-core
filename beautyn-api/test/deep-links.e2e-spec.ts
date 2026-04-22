import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/database/prisma.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { JwtAuthGuard } from '../src/shared/guards/jwt-auth.guard';

describe('Deep link endpoints (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseClient)
      .useValue({ auth: {} })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/.well-known/apple-app-site-association (GET)', () => {
    it('returns the AASA JSON with the correct Content-Type and app IDs', async () => {
      const response = await request(app.getHttpServer())
        .get('/.well-known/apple-app-site-association')
        .expect(200)
        .expect('Content-Type', /application\/json/);

      expect(response.body).toHaveProperty('applinks.details');
      expect(Array.isArray(response.body.applinks.details)).toBe(true);

      const [detail] = response.body.applinks.details;
      expect(detail.appIDs).toEqual(
        expect.arrayContaining([
          '452NG5983H.com.beautyn.app',
          '452NG5983H.com.beautyn.app.stage',
          '452NG5983H.com.beautyn.app.dev',
        ]),
      );
      expect(detail.components).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ '/': '/auth/reset' }),
        ]),
      );
    });
  });

  describe('/auth/reset (GET)', () => {
    it('returns the HTML fallback page', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/reset')
        .expect(200)
        .expect('Content-Type', /text\/html/);

      expect(response.text).toContain('Open the Beautyn app to finish resetting your password.');
    });
  });
});
