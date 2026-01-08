import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CrmIntegrationModule } from '../crm-integration/core/crm-integration.module';
import { BookingService } from './booking.service';
import { BookingQueryService } from './booking-query.service';
import { BookingSyncService } from './booking-sync.service';

@Module({
  imports: [SharedModule, CrmIntegrationModule],
  providers: [BookingService, BookingQueryService, BookingSyncService],
  exports: [BookingService, BookingQueryService, BookingSyncService],
})
export class BookingModule {}
