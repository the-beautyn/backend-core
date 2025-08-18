import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthPublicController } from './v1/public/auth.public.controller';
import { HealthController } from './v1/public/health.controller';

@Module({
  imports: [AuthModule],
  controllers: [AuthPublicController, HealthController],
})
export class PublicApiModule {}
