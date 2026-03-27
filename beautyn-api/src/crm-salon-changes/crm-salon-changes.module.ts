import { Module } from '@nestjs/common';
import { CrmIntegrationModule } from '../crm-integration/core/crm-integration.module';
import { CrmSalonDiffService } from './crm-salon-diff.service';

@Module({
  imports: [CrmIntegrationModule],
  providers: [CrmSalonDiffService],
  exports: [CrmSalonDiffService],
})
export class CrmSalonChangesModule {}
