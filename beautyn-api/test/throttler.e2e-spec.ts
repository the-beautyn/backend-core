// Throttle test-only tuning: set before importing AppModule so ConfigModule
// picks these up and the module's useFactory computes named limits from them.
// Tests assert these exact limits, so keep them in sync with the `describe`
// blocks below.
process.env.THROTTLE_OTP_BURST_LIMIT = '2';
process.env.THROTTLE_OTP_BURST_TTL_MS = '60000';
process.env.THROTTLE_OTP_HOUR_LIMIT = '5';
process.env.THROTTLE_OTP_HOUR_TTL_MS = '3600000';
process.env.THROTTLE_OTP_VERIFY_LIMIT = '3';
process.env.THROTTLE_OTP_VERIFY_TTL_MS = '300000';
process.env.THROTTLE_EMAIL_CHECK_LIMIT = '3';
process.env.THROTTLE_EMAIL_CHECK_TTL_MS = '60000';

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/shared/database/prisma.service';
import { SupabaseClient } from '@supabase/supabase-js';
import { JwtAuthGuard } from '../src/shared/guards/jwt-auth.guard';
import { SMS_PROVIDER } from '../src/auth/sms/sms-provider.interface';

describe('Throttler (e2e)', () => {
  let app: INestApplication;

  // Each test uses a unique user id via the Authorization header suffix —
  // UserThrottlerGuard.getTracker keys on req.user.id, so unique ids isolate
  // buckets between tests. Without this, supertest's shared 127.0.0.1 tracker
  // would make buckets leak.
  const authAs = (id: string) => ['Authorization', `Bearer ${id}`] as const;

  beforeAll(async () => {
    const mockJwtGuard = {
      canActivate: jest.fn().mockImplementation((context) => {
        const req = context.switchToHttp().getRequest();
        const header = req.headers.authorization as string | undefined;
        if (!header?.startsWith('Bearer ')) return false;
        const token = header.slice('Bearer '.length);
        req.user = { id: token, accessToken: token };
        return true;
      }),
    };

    const prismaMock: Partial<PrismaService> = {
      users: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      } as any,
    };

    const smsProviderMock = {
      sendOtp: jest.fn().mockResolvedValue(undefined),
      verifyOtp: jest.fn().mockResolvedValue(true),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SupabaseClient)
      .useValue({
        auth: {
          signUp: jest.fn(),
          signInWithPassword: jest.fn(),
          resetPasswordForEmail: jest.fn(),
          verifyOtp: jest.fn(),
          admin: { signOut: jest.fn(), updateUserById: jest.fn() },
        },
      })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtGuard)
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .overrideProvider(SMS_PROVIDER)
      .useValue(smsProviderMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('email-check', () => {
    it('allows requests up to the env-configured limit, then returns 429', async () => {
      const limit = Number(process.env.THROTTLE_EMAIL_CHECK_LIMIT);
      const payload = { email: 'enumeration-probe@example.com' };

      // Under the limit: all allowed.
      for (let i = 0; i < limit; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/check-email')
          .send(payload);
        expect(res.status).not.toBe(429);
      }

      // One over: blocked.
      const blocked = await request(app.getHttpServer())
        .post('/api/v1/auth/check-email')
        .send(payload);
      expect(blocked.status).toBe(429);
    });
  });

  describe('phone/send-otp and phone/resend-otp share the otp-burst bucket', () => {
    it('resend-otp is blocked by 2× send-otp exhausting the shared burst limit', async () => {
      const [authKey, authVal] = authAs('user-burst-share');

      // With THROTTLE_OTP_BURST_LIMIT=2, two sends pass.
      const first = await request(app.getHttpServer())
        .post('/api/v1/auth/phone/send-otp')
        .set(authKey, authVal)
        .send({ phone: '+380501111111' });
      expect(first.status).toBe(200);

      const second = await request(app.getHttpServer())
        .post('/api/v1/auth/phone/send-otp')
        .set(authKey, authVal)
        .send({ phone: '+380501111111' });
      expect(second.status).toBe(200);

      // resend-otp hits the *same* otp-burst bucket — should now be 429
      // instead of 200, proving the shared-bucket semantics in the guard's
      // generateKey (no route-specific prefix).
      const resend = await request(app.getHttpServer())
        .post('/api/v1/auth/phone/resend-otp')
        .set(authKey, authVal)
        .send({ phone: '+380501111111' });
      expect(resend.status).toBe(429);
    });
  });

  describe('verify-otp uses a separate bucket from send-otp', () => {
    it('exhausting otp-burst does not block verify-otp (different named throttler)', async () => {
      const [authKey, authVal] = authAs('user-bucket-isolation');

      // Drain otp-burst with 2 sends (limit=2).
      await request(app.getHttpServer())
        .post('/api/v1/auth/phone/send-otp')
        .set(authKey, authVal)
        .send({ phone: '+380502222222' });
      await request(app.getHttpServer())
        .post('/api/v1/auth/phone/send-otp')
        .set(authKey, authVal)
        .send({ phone: '+380502222222' });
      const overBurst = await request(app.getHttpServer())
        .post('/api/v1/auth/phone/send-otp')
        .set(authKey, authVal)
        .send({ phone: '+380502222222' });
      expect(overBurst.status).toBe(429);

      // verify-otp opts into otp-verify only — should be unaffected.
      const verify = await request(app.getHttpServer())
        .post('/api/v1/auth/phone/verify-otp')
        .set(authKey, authVal)
        .send({ phone: '+380502222222', code: '123456' });
      expect(verify.status).not.toBe(429);
    });

    it('verify-otp is rate-limited by its own limit (THROTTLE_OTP_VERIFY_LIMIT)', async () => {
      const [authKey, authVal] = authAs('user-verify-limit');
      const limit = Number(process.env.THROTTLE_OTP_VERIFY_LIMIT);

      for (let i = 0; i < limit; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/phone/verify-otp')
          .set(authKey, authVal)
          .send({ phone: '+380503333333', code: '000000' });
        expect(res.status).not.toBe(429);
      }

      const blocked = await request(app.getHttpServer())
        .post('/api/v1/auth/phone/verify-otp')
        .set(authKey, authVal)
        .send({ phone: '+380503333333', code: '000000' });
      expect(blocked.status).toBe(429);
    });
  });

  describe('per-user isolation', () => {
    it('exhausting one user\'s otp-burst does not block a different user', async () => {
      const [keyA, valA] = authAs('user-isolation-A');
      const [keyB, valB] = authAs('user-isolation-B');

      // Drain user A's otp-burst (limit=2).
      await request(app.getHttpServer())
        .post('/api/v1/auth/phone/send-otp')
        .set(keyA, valA)
        .send({ phone: '+380504444444' });
      await request(app.getHttpServer())
        .post('/api/v1/auth/phone/send-otp')
        .set(keyA, valA)
        .send({ phone: '+380504444444' });
      const blockedA = await request(app.getHttpServer())
        .post('/api/v1/auth/phone/send-otp')
        .set(keyA, valA)
        .send({ phone: '+380504444444' });
      expect(blockedA.status).toBe(429);

      // User B starts with a fresh bucket.
      const firstB = await request(app.getHttpServer())
        .post('/api/v1/auth/phone/send-otp')
        .set(keyB, valB)
        .send({ phone: '+380505555555' });
      expect(firstB.status).toBe(200);
    });
  });

  describe('routes without @Throttle are never throttled', () => {
    it('login (no throttle decorator) can be called repeatedly without 429', async () => {
      // /login has no @Throttle, so the guard's opt-in check should skip
      // every registered throttler for this handler. The exact response
      // status doesn't matter (unmocked Supabase makes it fail); we only
      // assert the guard never short-circuits with 429.
      for (let i = 0; i < 10; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ email: 'x@example.com', password: 'y' });
        expect(res.status).not.toBe(429);
      }
    });
  });
});
