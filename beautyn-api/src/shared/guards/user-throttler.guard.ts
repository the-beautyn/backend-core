import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLER_LIMIT, THROTTLER_SKIP } from '@nestjs/throttler/dist/throttler.constants';

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

  // Make throttlers opt-in: a throttler ticks only if the route explicitly
  // names it in @Throttle({...}). Without this, @nestjs/throttler runs every
  // registered throttler on every guarded request, which caused send-otp to
  // tick otp-verify's bucket (and vice versa).
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    for (const t of this.throttlers) {
      const hasExplicitConfig = this.reflector.getAllAndOverride(
        `${THROTTLER_LIMIT}${t.name}`,
        [handler, classRef],
      );
      if (!hasExplicitConfig) {
        Reflect.defineMetadata(`${THROTTLER_SKIP}${t.name}`, true, handler);
      }
    }

    return super.canActivate(context);
  }
}
