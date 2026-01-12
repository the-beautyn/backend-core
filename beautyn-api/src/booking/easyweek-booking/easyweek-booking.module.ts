import { Module } from '@nestjs/common';
import { SharedModule } from '../../shared/shared.module';
import { CrmIntegrationModule } from '../../crm-integration/core/crm-integration.module';
import { EasyweekBookingService } from './easyweek-booking.service';
import { BookingModule } from '../booking.module';

@Module({
  imports: [SharedModule, CrmIntegrationModule, BookingModule],
  providers: [EasyweekBookingService],
  exports: [EasyweekBookingService],
})
export class EasyweekBookingModule {}
