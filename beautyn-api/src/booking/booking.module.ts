import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CrmIntegrationModule } from '../crm-integration/core/crm-integration.module';
import { BookingQueryService } from './booking-query.service';
import { BookingSyncService } from './booking-sync.service';
import { BookingHandlerService } from './booking-handler.service';

@Module({
  imports: [SharedModule, CrmIntegrationModule],
  providers: [BookingQueryService, BookingSyncService, BookingHandlerService],
  exports: [BookingQueryService, BookingSyncService, BookingHandlerService],
})
export class BookingModule {}
