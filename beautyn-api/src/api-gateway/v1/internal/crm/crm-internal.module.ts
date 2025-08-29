import { Module } from '@nestjs/common';
import { CrmInternalController } from './crm-internal.controller';
import { CrmAdapterModule } from '@crm/adapter';

@Module({
  imports: [CrmAdapterModule],
  controllers: [CrmInternalController],
})
export class CrmInternalModule {}

