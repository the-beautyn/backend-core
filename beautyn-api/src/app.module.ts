import {
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  LoggerInterceptor,
  LoggerModule,
  RequestCorrelationMiddleware,
} from '@shared/logger';
import { ApiGatewayModule } from './api-gateway/api-gateway.module';
import { SharedModule } from './shared/shared.module';
import { SupabaseModule } from './shared/supabase/supabase.module';

@Module({
  imports: [ApiGatewayModule, SharedModule, SupabaseModule, LoggerModule],
  providers: [{ provide: APP_INTERCEPTOR, useClass: LoggerInterceptor }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestCorrelationMiddleware).forRoutes('*');
  }
}
