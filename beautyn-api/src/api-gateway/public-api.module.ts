import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ServicesModule } from '../services/services.module';
import { AuthPublicController } from './v1/public/auth.public.controller';
import { HealthController } from './v1/public/health.controller';
import { ServicesController } from './v1/public/services.controller';

@Module({
  imports: [AuthModule, ServicesModule],
  controllers: [AuthPublicController, HealthController, ServicesController],
})
export class PublicApiModule {}
