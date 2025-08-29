import { Module } from '@nestjs/common';
import { CrmAdapterService } from './crm-adapter.service';
import { CapabilityRegistryModule } from '@crm/capability-registry';
import { ProviderCoreModule } from '@crm/provider-core';
import { SyncSchedulerModule } from '@crm/sync-scheduler';

@Module({
  imports: [CapabilityRegistryModule, ProviderCoreModule, SyncSchedulerModule],
  providers: [CrmAdapterService],
  exports: [CrmAdapterService],
})
export class CrmAdapterModule {}

