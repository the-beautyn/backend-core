import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ServicesService } from './services.service';
import { CrmIntegrationModule } from '../crm-integration/core/crm-integration.module';
import { CapabilityRegistryModule } from '@crm/capability-registry';
import { ServicesRepository } from './repositories/services.repo';

@Module({
  imports: [SharedModule, CrmIntegrationModule, CapabilityRegistryModule],
  providers: [ServicesService, ServicesRepository],
  exports: [ServicesService, ServicesRepository],
})
export class ServicesModule {}
