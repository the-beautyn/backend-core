import { ConfigService } from '@nestjs/config';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

// CORS for browser clients (e.g. the owner web panel). Allowed origins come
// from CORS_ALLOWED_ORIGINS (comma-separated). Outside production we fall back
// to the local Vite dev/preview origins so `npm run dev` works out of the box;
// in production we never allow localhost — CORS stays closed unless origins are
// explicitly configured, so credentialed cross-origin access can't be opened by
// an unset env var.
export function corsOptionsFromConfig(configService: ConfigService): CorsOptions {
  const configuredOrigins = configService
    .get<string>('CORS_ALLOWED_ORIGINS')
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  return {
    origin: configuredOrigins?.length
      ? configuredOrigins
      : isProduction
        ? false
        : ['http://localhost:5173', 'http://localhost:4173'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
}
