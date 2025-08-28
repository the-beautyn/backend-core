import { Global, Module } from '@nestjs/common';
import { LoggerInterceptor } from './interceptors/logger.interceptor';
import { RequestCorrelationMiddleware } from './middleware/correlation.middleware';

@Global()
@Module({
  providers: [],
  exports: [LoggerInterceptor, RequestCorrelationMiddleware],
})
export class LoggerModule {}
