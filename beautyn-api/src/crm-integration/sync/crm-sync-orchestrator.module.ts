import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { CrmIntegrationModule } from '../core/crm-integration.module';
import { SalonModule } from '../../salon/salon.module';
import { CategoriesModule } from '../../categories/categories.module';
import { ServicesModule } from '../../services/services.module';
import { WorkersModule } from '../../workers/workers.module';
import { CrmSyncOrchestratorService } from './crm-sync-orchestrator.service';

@Module({
  imports: [
    SharedModule,
    CrmIntegrationModule,
    SalonModule,
    CategoriesModule,
    ServicesModule,
    WorkersModule,
  ],
  providers: [CrmSyncOrchestratorService],
  exports: [CrmSyncOrchestratorService],
})
export class CrmSyncOrchestratorModule {}
