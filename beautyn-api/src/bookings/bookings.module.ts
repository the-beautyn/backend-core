import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { CrmAdapterModule } from '@crm/adapter';
import { BookingsService } from './bookings.service';

@Module({
  imports: [SharedModule, CrmAdapterModule],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}


