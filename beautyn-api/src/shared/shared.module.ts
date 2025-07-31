import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransformInterceptor } from './interceptors/transform.interceptor';
import { AppConfigService } from './services/app-config.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Global()
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' })],
  providers: [AppConfigService, TransformInterceptor, JwtAuthGuard],
  exports: [AppConfigService, TransformInterceptor, JwtAuthGuard],
})
export class SharedModule {}
