import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ServicesModule } from '../services/services.module';
import { SalonModule } from '../salon/salon.module';
import { AuthPublicController } from './v1/public/auth.public.controller';
import { HealthController } from './v1/public/health.controller';
import { ServicesController } from './v1/public/services.controller';
import { WorkersModule } from '../workers/workers.module';
import { WorkersController } from './v1/public/workers.controller';
import { SalonsController } from './v1/public/salons.controller';

@Module({
  imports: [AuthModule, ServicesModule, WorkersModule, SalonModule],
  controllers: [AuthPublicController, HealthController, ServicesController, WorkersController, SalonsController],
})
export class PublicApiModule {}
