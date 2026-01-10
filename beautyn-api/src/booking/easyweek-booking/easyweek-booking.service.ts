import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { CrmIntegrationService } from '../../crm-integration/core/crm-integration.service';
import { EasyweekBookingDtoNormalized } from '../../crm-integration/core/dto/easyweek-booking.dto';
import { BookingHandlerService } from '../booking-handler.service';
import type { EasyweekBookingsSyncDto } from '../dto/bookings-sync.dto';
import type { EasyWeekBooking } from '@crm/provider-core/easyweek/bookings';

@Injectable()
export class EasyweekBookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmIntegration: CrmIntegrationService,
    private readonly bookingHandler: BookingHandlerService,
  ) {}

  async handleBookings(params: {
    bookings: EasyWeekBooking[];
  }) {
    const results = await Promise.all(
      params.bookings.map((booking) =>
        this.bookingHandler.handleEasyweekBooking({ booking }),
      ),
    );
    return {
      bookings: results.map(result => result.booking)
    }
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

  private mapEasyweekRawToNormalized(raw: any): EasyweekBookingDtoNormalized | null {
    if (!raw) return null;
    const bookingUuid = raw?.uuid ?? raw?.externalId ?? null;
    const startTime = raw?.startTime ?? raw?.start_time ?? null;
    const endTime = raw?.endTime ?? raw?.end_time ?? null;
    if (!bookingUuid || !startTime) return null;

    return {
      bookingUuid: String(bookingUuid),
      locationUuid: raw?.locationUuid ?? raw?.location_uuid ?? null,
      startTime,
      endTime,
      timezone: raw?.timezone ?? raw?.time_zone ?? null,
      isCanceled: raw?.isCanceled ?? raw?.is_canceled ?? undefined,
      isCompleted: raw?.isCompleted ?? raw?.is_completed ?? undefined,
      statusName: raw?.statusName ?? raw?.status?.name ?? raw?.status_name ?? null,
      orderedServices: raw?.orderedServices ?? raw?.ordered_services ?? [],
      order: raw?.order ?? null,
      comment: raw?.publicNotes ?? raw?.public_notes ?? null,
      duration: raw?.duration ?? null,
      policy: raw?.policy ?? null,
      links: raw?.links ?? null,
      raw: raw,
    };
  }

}
