import { Module } from '@nestjs/common';
import { BrandModule } from '../brand/brand.module';
import { CrmSalonDiffService } from './crm-salon-diff.service';
import { forwardRef } from '@nestjs/common';

@Module({
  imports: [forwardRef(() => BrandModule)],
  providers: [CrmSalonDiffService],
  exports: [CrmSalonDiffService],
})
export class CrmSalonChangesModule {}
