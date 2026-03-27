import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { OnboardingService } from './onboarding.service';
import { CrmProvidersRegistry } from './providers/crm-providers.registry';
import { EasyWeekDiscoveryClient, HttpEasyWeekDiscoveryClient } from './clients/easyweek-discovery.client';
import { CrmSalonChangesModule } from '../crm-salon-changes/crm-salon-changes.module';
import { SyncSchedulerModule } from '@crm/sync-scheduler';
import { CrmIntegrationModule } from '../crm-integration/core/crm-integration.module';
import { CrmSyncOrchestratorModule } from '../crm-integration/sync/crm-sync-orchestrator.module';

@Module({
  imports: [
    SharedModule,
    CrmIntegrationModule,
    CrmSyncOrchestratorModule,
    SyncSchedulerModule,
    CrmSalonChangesModule,
  ],
  providers: [
    OnboardingService,
    CrmProvidersRegistry,
    { provide: EasyWeekDiscoveryClient, useClass: HttpEasyWeekDiscoveryClient },
  ],
  exports: [OnboardingService, CrmProvidersRegistry, CrmIntegrationModule],
})
export class OnboardingModule {}
