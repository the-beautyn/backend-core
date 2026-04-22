import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.id as string | undefined;
    return userId ?? req.ip ?? 'anonymous';
  }

  // Drop the route-specific prefix so that different endpoints sharing the
  // same named throttle share a bucket — e.g. phone/send-otp and
  // phone/resend-otp both tick the same `otp-burst` / `otp-hour` counters.
  protected generateKey(_context: ExecutionContext, suffix: string, name: string): string {
    return `user-throttler:${name}:${suffix}`;
  }
}
