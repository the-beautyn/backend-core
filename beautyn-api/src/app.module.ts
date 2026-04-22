import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ApiGatewayModule } from './api-gateway/api-gateway.module';
import { SharedModule } from './shared/shared.module';
import { SupabaseModule } from './shared/supabase/supabase.module';
import { StorageModule } from './shared/storage/storage.module';
import { LoggerModule, RequestCorrelationMiddleware, LoggerInterceptor } from '@shared/logger';
import { CrmInternalModule } from './api-gateway/v1/internal/crm/crm-internal.module';

@Module({
  imports: [
    ApiGatewayModule,
    SharedModule,
    SupabaseModule,
    StorageModule,
    LoggerModule,
    CrmInternalModule,
    // In-memory storage: assumes a single API instance. Switch to a Redis
    // storage backend before scaling out — counters won't sync across pods.
    ThrottlerModule.forRoot([
      { name: 'otp-burst', ttl: 60 * 1000, limit: 1 },
      { name: 'otp-hour', ttl: 60 * 60 * 1000, limit: 3 },
      { name: 'otp-verify', ttl: 5 * 60 * 1000, limit: 10 },
    ]),
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggerInterceptor }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestCorrelationMiddleware).forRoutes('*');
  }
}
