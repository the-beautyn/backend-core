import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ApiGatewayModule } from './api-gateway/api-gateway.module';
import { SharedModule } from './shared/shared.module';
import { SupabaseModule } from './shared/supabase/supabase.module';
import { StorageModule } from './shared/storage/storage.module';
import { AppThrottlerModule } from './shared/throttler/app-throttler.module';
import { LoggerModule, RequestCorrelationMiddleware, LoggerInterceptor } from '@shared/logger';
import { CrmInternalModule } from './api-gateway/v1/internal/crm/crm-internal.module';

@Module({
  imports: [
    ApiGatewayModule,
    SharedModule,
    SupabaseModule,
    StorageModule,
    AppThrottlerModule,
    LoggerModule,
    CrmInternalModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggerInterceptor }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestCorrelationMiddleware).forRoutes('*');
  }
}
