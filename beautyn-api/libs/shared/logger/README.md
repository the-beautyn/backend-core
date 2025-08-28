# Shared Logger

Provides a global structured logger for NestJS services. Logs are JSON formatted and written to stdout using Winston. Each request is tagged with an `x-request-id` allowing correlation across services.

## Usage

1. Import the `LoggerModule` once in your root module and apply the `RequestCorrelationMiddleware` globally.
2. Register the `LoggerInterceptor` using the `APP_INTERCEPTOR` token.

```ts
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LoggerModule, RequestCorrelationMiddleware, LoggerInterceptor } from '@shared/logger';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  imports: [LoggerModule],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggerInterceptor }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestCorrelationMiddleware).forRoutes('*');
  }
}
```

## Environment Variables

- `LOG_LEVEL` – log verbosity (default `info`).
- `SERVICE_NAME` – included in log metadata (default `api`).
- `NODE_ENV` – environment name (default `development`).

