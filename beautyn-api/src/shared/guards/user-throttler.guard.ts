import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { THROTTLER_LIMIT, THROTTLER_SKIP } from '@nestjs/throttler/dist/throttler.constants';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  // Anonymous callers are tracked by CF-Connecting-IP. Deployed, requests pass
  // Cloudflare → Railway edge → app: req.ip is Railway's internal proxy
  // address, and the edge rewrites X-Forwarded-For to start at the Cloudflare
  // server, so neither identifies the client. Cloudflare sets
  // CF-Connecting-IP itself and rejects requests that send their own (403).
  // That only holds while the app is reachable solely through Cloudflare, so
  // the Railway-generated public domain must stay off; if the app ever gets a
  // second way in, verify the source before trusting this header.
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const userId = req.user?.id as string | undefined;
    const cfClientIp = req.headers?.['cf-connecting-ip'] as string | undefined;
    return userId ?? cfClientIp ?? req.ip ?? 'anonymous';
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
  //
  // Presence check uses Reflect.hasMetadata rather than reading the limit
  // value — that way routes can opt in with `@Throttle({ 'otp-burst': {} })`
  // and inherit limit/ttl from the module config (env-sourced), without
  // having to hardcode numbers at the call site.
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const classRef = context.getClass();

    for (const t of this.throttlers) {
      const key = `${THROTTLER_LIMIT}${t.name}`;
      const declared =
        Reflect.hasMetadata(key, handler) || Reflect.hasMetadata(key, classRef);
      if (!declared) {
        Reflect.defineMetadata(`${THROTTLER_SKIP}${t.name}`, true, handler);
      }
    }

    return super.canActivate(context);
  }
}
