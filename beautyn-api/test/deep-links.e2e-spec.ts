import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/database/prisma.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { JwtAuthGuard } from '../src/shared/guards/jwt-auth.guard';
import { TransformInterceptor } from '../src/shared/interceptors/transform.interceptor';

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
    // Match production bootstrap so this test actually exercises the
    // global envelope interceptor. Without this, a handler that forgets
    // @SkipResponseTransform() would pass the test but fail in prod.
    app.useGlobalInterceptors(app.get(TransformInterceptor));
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
      // Apple parses this directly — it must NOT be wrapped in the global
      // { success, data } envelope, or Universal Links association fails.
      expect(response.body).not.toHaveProperty('success');
      expect(response.body).not.toHaveProperty('data');

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
    it('returns the HTML fallback page raw, not JSON-wrapped', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/reset')
        .expect(200)
        .expect('Content-Type', /text\/html/);

      expect(response.text).toContain('Open the Beautyn app to finish resetting your password.');
      // Must be raw HTML. If the global envelope interceptor wraps it,
      // response.text starts with `{` (JSON).
      expect(response.text.trimStart()).toMatch(/^<!DOCTYPE html>/i);
    });
  });
});
