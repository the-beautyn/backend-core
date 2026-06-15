import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { InternalApiKeyGuard } from '../../../shared/guards/internal-api-key.guard';
import { EasyweekBookingService } from '../../../booking/easyweek-booking/easyweek-booking.service';
import { AltegioBookingsSyncDto, EasyweekBookingsSyncDto } from '../../../booking/dto/bookings-sync.dto';
import { AltegioBookingService } from '../../../booking/altegio-booking/altegio-booking.service';
import { BookingSyncService } from '../../../booking/booking-sync.service';
import { BookingsRebaseDto } from '../../../booking/dto/bookings-rebase.dto';
import { BookingsDispatchDto } from '../../../booking/dto/bookings-dispatch.dto';
import { BookingDto } from '../../../booking/dto/booking.response.dto';
import { CrmIntegrationService } from '../../../crm-integration/core/crm-integration.service';

@ApiExcludeController()
@Controller('api/v1/internal/bookings')
export class BookingsInternalController {
  constructor(
    private readonly altegioBookingService: AltegioBookingService,
    private readonly easyweekBookingService: EasyweekBookingService,
    private readonly bookingSync: BookingSyncService,
    private readonly crmIntegration: CrmIntegrationService,
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
    const bookings = await this.bookingSync.rebaseFromCrm(dto.salon_id, dto.lane);
    return bookings;
  }

  // Cron-only: fan a lane tick out across all active CRM salons. Not owner-reachable.
  // Fast = bookings only; slow = bookings + catalog (categories/services/workers/salon).
  @Post('dispatch')
  @UseGuards(InternalApiKeyGuard)
  @HttpCode(HttpStatus.OK)
  async dispatch(@Body() dto: BookingsDispatchDto): Promise<{ enqueued: number; catalog: number; total: number }> {
    return this.crmIntegration.dispatchLane(dto.lane);
  }
}
