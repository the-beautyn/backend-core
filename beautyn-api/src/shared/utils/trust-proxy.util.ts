import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';

// Deployed, requests reach the app through Cloudflare and the Railway edge, so
// the socket address is a proxy's, and every anonymous caller would share one
// per-IP throttler bucket (UserThrottlerGuard keys on req.ip). Trusting exactly
// TRUST_PROXY_HOPS hops makes req.ip the client address. Never `true`: that
// trusts any X-Forwarded-For a client sends and lets it pick its own bucket.
// A hop count cannot tell a real proxy from a caller that skipped one, so the
// app must only be reachable through that chain (no public Railway domain).
export function applyTrustProxy(
  app: NestExpressApplication,
  configService: ConfigService,
): void {
  const hops = Number(configService.get<string>('TRUST_PROXY_HOPS'));
  if (Number.isInteger(hops) && hops > 0) {
    app.set('trust proxy', hops);
  }
}
