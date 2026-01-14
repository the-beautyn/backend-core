import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { CategoriesInternalController } from './v1/internal/categories.internal.controller';
import { ServicesModule } from '../services/services.module';
import { ServicesInternalController } from './v1/internal/services.internal.controller';
import { WorkersModule } from '../workers/workers.module';
import { WorkersInternalController } from './v1/internal/workers.internal.controller';
import { BookingsInternalController } from './v1/internal/bookings.internal.controller';
import { BookingModule } from '../booking/booking.module';
import { EasyweekBookingModule } from '../booking/easyweek-booking/easyweek-booking.module';
import { AltegioBookingModule } from '../booking/altegio-booking/altegio-booking.module';
import { SalonModule } from '../salon/salon.module';
import { SalonsInternalController } from './v1/internal/salons.internal.controller';

@Module({
  imports: [
    CategoriesModule,
    ServicesModule,
    WorkersModule,
    BookingModule,
    EasyweekBookingModule,
    AltegioBookingModule,
    SalonModule,
  ],
  controllers: [
    CategoriesInternalController,
    ServicesInternalController,
    WorkersInternalController,
    BookingsInternalController,
    SalonsInternalController,
  ],
})
export class InternalApiModule {}
