import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CrmIntegrationService } from '../../crm-integration/core/crm-integration.service';
import { EasyweekBookingDtoNormalized } from '../../crm-integration/core/dto/easyweek-booking.dto';
import { BookingHandlerService } from '../booking-handler.service';
import type { EasyweekBookingsSyncDto } from '../dto/bookings-sync.dto';
import type { EasyWeekBooking } from '@crm/provider-core/easyweek/bookings';
import type { BookingDto } from '../dto/booking.response.dto';
import { BookingQueryService } from '../booking-query.service';

@Injectable()
export class EasyweekBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmIntegration: CrmIntegrationService,
    private readonly bookingHandler: BookingHandlerService,
    private readonly bookingQuery: BookingQueryService,
  ) {}

  async handleBookings(params: { bookings: EasyWeekBooking[] }): Promise<BookingDto[]> {
    const results = await Promise.all(
      params.bookings.map((booking) =>
        this.bookingHandler.handleEasyweekBooking({ booking }),
      ),
    );
    const bookingIds = results.map((result) => result.booking?.id).filter((id): id is string => !!id);
    return this.bookingQuery.getByIds(bookingIds);
  }

  async handleBooking(params: { booking: EasyWeekBooking | EasyweekBookingDtoNormalized }) {
    return this.bookingHandler.handleEasyweekBooking({ booking: params.booking });
  }

  async confirmEasyweekBooking(salonId: string, bookingUuid: string, userId?: string) {
    const details = await this.crmIntegration.fetchEasyweekBookingDetails({ salonId, bookingUuid });
    const workspaceSlug = await this.crmIntegration.getEasyweekWorkspaceSlug(salonId);
    const result = await this.bookingHandler.createEasyweekBooking({
      salonId,
      booking: details,
      workspaceSlug,
      userId: userId ?? null,
    });
    const booking = await this.prisma.booking.findUniqueOrThrow({ where: { id: result.booking.id } });

    return {
      bookingId: booking.id,
      status: booking.status,
      datetime: booking.datetime,
      endDatetime: booking.endDatetime ?? null,
      easyweek: {
        bookingUuid: details.bookingUuid,
        locationUuid: details.locationUuid ?? null,
        timezone: details.timezone ?? null,
        isCanceled: details.isCanceled ?? undefined,
        isCompleted: details.isCompleted ?? undefined,
        statusName: details.statusName ?? null,
      },
    };
  }
}
