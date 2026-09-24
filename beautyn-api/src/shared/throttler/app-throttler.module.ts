import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../guards/user-throttler.guard';

// Keeps ThrottlerModule configuration co-located with UserThrottlerGuard,
// and makes the guard globally injectable so @UseGuards(UserThrottlerGuard)
// on any controller resolves correctly.
//
// In-memory storage: assumes a single API instance. Switch to a Redis
// storage backend before scaling out — counters won't sync across pods.
//
// Limits and TTLs are env-overridable so each environment (dev/staging/prod)
// can tune them independently. Defaults below are production-safe.
const num = (config: ConfigService, key: string, fallback: number): number => {
  const raw = config.get<string>(key);
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

@Global()
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'otp-burst',
          ttl: num(config, 'THROTTLE_OTP_BURST_TTL_MS', 60 * 1000),
          limit: num(config, 'THROTTLE_OTP_BURST_LIMIT', 1),
        },
        {
          name: 'otp-hour',
          ttl: num(config, 'THROTTLE_OTP_HOUR_TTL_MS', 60 * 60 * 1000),
          limit: num(config, 'THROTTLE_OTP_HOUR_LIMIT', 10),
        },
        {
          name: 'otp-verify',
          ttl: num(config, 'THROTTLE_OTP_VERIFY_TTL_MS', 5 * 60 * 1000),
          limit: num(config, 'THROTTLE_OTP_VERIFY_LIMIT', 10),
        },
        // Per-IP limit for unauthenticated endpoints that leak account
        // enumeration info (e.g. check-email distinguishes not_found vs
        // registered providers). 10/min is generous for legitimate clients
        // and slows scripted scans by ~100x relative to unlimited.
        {
          name: 'email-check',
          ttl: num(config, 'THROTTLE_EMAIL_CHECK_TTL_MS', 60 * 1000),
          limit: num(config, 'THROTTLE_EMAIL_CHECK_LIMIT', 10),
        },
        // Per-IP limit for forgot-password: every accepted call sends an
        // email through Supabase, so an unthrottled endpoint lets a script
        // drain the project's email quota. Supabase's own 60 s per-address
        // limit does not help against many different addresses.
        {
          name: 'forgot-password',
          ttl: num(config, 'THROTTLE_FORGOT_PASSWORD_TTL_MS', 15 * 60 * 1000),
          limit: num(config, 'THROTTLE_FORGOT_PASSWORD_LIMIT', 5),
        },
      ],
    }),
  ],
  providers: [UserThrottlerGuard],
  exports: [UserThrottlerGuard],
})
export class AppThrottlerModule {}
