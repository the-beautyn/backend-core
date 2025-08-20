import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthPublicController } from './v1/public/auth.public.controller';
import { HealthController } from './v1/public/health.controller';
import { WorkersModule } from '../workers/workers.module';
import { WorkersController } from './v1/public/workers.controller';

@Module({
  imports: [AuthModule, WorkersModule],
  controllers: [AuthPublicController, HealthController, WorkersController],
})
export class PublicApiModule {}
