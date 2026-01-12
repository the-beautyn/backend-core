import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InternalApiKeyGuard } from '../../../shared/guards/internal-api-key.guard';
import { EasyweekBookingService } from '../../../booking/easyweek-booking/easyweek-booking.service';
import { AltegioBookingsSyncDto, EasyweekBookingsSyncDto } from '../../../booking/dto/bookings-sync.dto';
import { AltegioBookingService } from '../../../booking/altegio-booking/altegio-booking.service';
import { BookingSyncService } from '../../../booking/booking-sync.service';
import { BookingsRebaseDto } from '../../../booking/dto/bookings-rebase.dto';
import { BookingDto } from '../../../booking/dto/booking.response.dto';

@ApiExcludeController()
@Controller('api/v1/internal/bookings')
export class BookingsInternalController {
  constructor(
    private readonly altegioBookingService: AltegioBookingService,
    private readonly easyweekBookingService: EasyweekBookingService,
    private readonly bookingSync: BookingSyncService,
  ) {}

  @Post('altegio/sync')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async syncAltegio(@Body() dto: AltegioBookingsSyncDto): Promise<BookingDto[]>  {
    return this.altegioBookingService.handleBookings({ bookings: dto.bookings });
  }

  @Post('easyweek/sync')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async syncEasyweek(@Body() dto: EasyweekBookingsSyncDto): Promise<BookingDto[]> {
    return this.easyweekBookingService.handleBookings( { bookings: dto.bookings });
  }

  @Post('rebase')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async rebase(@Body() dto: BookingsRebaseDto): Promise<BookingDto[]>  {
    const bookings = await this.bookingSync.rebaseFromCrm(dto.salon_id);
    return bookings;
  }
}
