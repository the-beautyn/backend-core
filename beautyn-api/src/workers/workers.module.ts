import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CrmIntegrationModule } from '../crm-integration/core/crm-integration.module';
import { CapabilityRegistryModule } from '@crm/capability-registry';
import { WorkersService } from './workers.service';
import { WorkersRepository } from './repositories/workers.repository';
import { WorkersCategory } from './category/workers.category';

@Module({
  imports: [SharedModule, CrmIntegrationModule, CapabilityRegistryModule],
  providers: [WorkersService, WorkersRepository, WorkersCategory],
  exports: [WorkersService, WorkersRepository, WorkersCategory],
})
export class WorkersModule {}
