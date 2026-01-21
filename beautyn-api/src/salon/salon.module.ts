import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ServicesModule } from '../services/services.module';
import { WorkersModule } from '../workers/workers.module';
import { CrmIntegrationModule } from '../crm-integration/core/crm-integration.module';
import { SalonService } from './salon.service';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [SharedModule, forwardRef(() =>  ServicesModule), WorkersModule, forwardRef(() =>  CrmIntegrationModule)],
  providers: [SalonService],
  exports: [SalonService],
})
export class SalonModule {}
