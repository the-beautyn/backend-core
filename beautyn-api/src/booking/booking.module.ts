import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CrmIntegrationModule } from '../crm-integration/core/crm-integration.module';
import { BookingService } from './booking.service';

@Module({
  imports: [SharedModule, CrmIntegrationModule],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
