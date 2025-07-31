import { Global, Module } from '@nestjs/common';
import { TransformInterceptor } from './interceptors/transform.interceptor';

@Global()
@Module({
  providers: [TransformInterceptor],
  exports: [TransformInterceptor],
})
export class SharedModule {}
