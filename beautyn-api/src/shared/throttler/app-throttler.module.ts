import { Global, Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { UserThrottlerGuard } from '../guards/user-throttler.guard';

// Keeps ThrottlerModule configuration co-located with UserThrottlerGuard,
// and makes the guard globally injectable so @UseGuards(UserThrottlerGuard)
// on any controller resolves correctly.
//
// In-memory storage: assumes a single API instance. Switch to a Redis
// storage backend before scaling out — counters won't sync across pods.
@Global()
@Module({
  imports: [
    ThrottlerModule.forRoot([
      { name: 'otp-burst', ttl: 60 * 1000, limit: 1 },
      { name: 'otp-hour', ttl: 60 * 60 * 1000, limit: 3 },
      { name: 'otp-verify', ttl: 5 * 60 * 1000, limit: 10 },
      // Per-IP limit for unauthenticated endpoints that leak account
      // enumeration info (e.g. check-email distinguishes not_found vs
      // registered providers). 10/min is generous for legitimate clients
      // and slows scripted scans by ~100x relative to unlimited.
      { name: 'email-check', ttl: 60 * 1000, limit: 10 },
    ]),
  ],
  providers: [UserThrottlerGuard],
  exports: [UserThrottlerGuard],
})
export class AppThrottlerModule {}
