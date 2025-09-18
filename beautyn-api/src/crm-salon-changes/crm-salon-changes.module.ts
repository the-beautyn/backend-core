import { Module } from '@nestjs/common';
import { CrmSalonDiffService } from './crm-salon-diff.service';

@Module({
  providers: [CrmSalonDiffService],
  exports: [CrmSalonDiffService],
})
export class CrmSalonChangesModule {}
