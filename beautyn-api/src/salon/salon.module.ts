import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ServicesModule } from '../services/services.module';
import { WorkersModule } from '../workers/workers.module';
import { CrmSalonChangesModule } from '../crm-salon-changes/crm-salon-changes.module';
import { SalonService } from './salon.service';

@Module({
  imports: [SharedModule, ServicesModule, WorkersModule, CrmSalonChangesModule],
  providers: [SalonService],
  exports: [SalonService],
})
export class SalonModule {}
