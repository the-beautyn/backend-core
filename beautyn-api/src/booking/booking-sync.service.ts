import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmType } from '@crm/shared';
import { PrismaService } from '../shared/database/prisma.service';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';
import { BookingHandlerService } from './booking-handler.service';
import { BookingQueryService } from './booking-query.service';
import { createChildLogger } from '@shared/logger';
import type { BookingDto } from './dto/booking.response.dto';
import type { AltegioBooking } from '@crm/provider-core/altegio/bookings';
import type { EasyWeekBooking } from '@crm/provider-core/easyweek/bookings';

@Injectable()
export class BookingSyncService {
  private readonly log = createChildLogger('booking-sync.service');
  constructor(
    private readonly prisma: PrismaService,
    private readonly crm: CrmIntegrationService,
    private readonly bookingHandler: BookingHandlerService,
    private readonly bookingQuery: BookingQueryService,
  ) {}

  async rebaseFromCrm(salonId: string): Promise<BookingDto[]> {
    const provider = await this.crm.resolveSalonProvider(salonId);

    const bookingIds = await this.prisma.booking
      .findMany({
        where: {
          salonId,
          crmType: provider,
          crmRecordId: { not: null },
        },
        select: { crmRecordId: true },
      })
      .then((rows) =>
        rows
          .map((row) => row.crmRecordId as string)
          .filter((id): id is string => Boolean(id)),
      );

    if (provider === CrmType.ALTEGIO) {
      const bookingsPage = await this.crm.pullAltegioBookings(salonId, bookingIds);
      const bookings = this.prepareAltegioPayload(bookingsPage?.items ?? []);
      const results = await Promise.all(
        bookings.map((booking) => this.bookingHandler.handleAltegioBooking({ booking })),
      );
      const ids = results.map((r) => r.booking?.id).filter((id): id is string => !!id);
      return this.bookingQuery.getByIds(ids);
    } else if (provider === CrmType.EASYWEEK) {
      const bookingsPage = await this.crm.pullEasyweekBookings(salonId, bookingIds);
      const bookings = this.prepareEasyweekPayload(bookingsPage?.items ?? []);
      const results = await Promise.all(
        bookings.map((booking) => this.bookingHandler.handleEasyweekBooking({ booking })),
      );
      const ids = results.map((r) => r.booking?.id).filter((id): id is string => !!id);
      return this.bookingQuery.getByIds(ids);
    }

    return [];
  }

  private prepareAltegioPayload(bookings: Array<AltegioBooking | Record<string, any>>): AltegioBooking[] {
    return (bookings ?? []).map((b) => {
      const externalId =
        (b as any).crmRecordId ??
        (b as any).externalId ??
        (b as any).id ??
        ((b as any).raw && ((b as any).raw.id ?? (b as any).raw.recordId ?? (b as any).raw.crmRecordId)) ??
        null;

      const datetime = (b as any).datetime ?? (b as any).startAtIso ?? null;
      const date = (b as any).date ?? null;
      const durationMin =
        typeof (b as any).durationMin === 'number'
          ? (b as any).durationMin
          : typeof (b as any).seanceLength === 'number'
            ? Math.round((b as any).seanceLength / 60)
            : typeof (b as any).length === 'number'
              ? Math.round((b as any).length / 60)
              : null;

      return {
        crmRecordId: externalId ? String(externalId) : undefined,
        companyId: (b as any).companyId ?? null,
        staffId: (b as any).staffId ?? (b as any).workerExternalId ?? null,
        clientId: (b as any).clientId ?? null,
        datetime: datetime ? String(datetime) : null,
        date: date ? String(date) : null,
        comment: (b as any).comment ?? (b as any).note ?? null,
        attendance: (b as any).attendance ?? null,
        confirmed: (b as any).confirmed ?? null,
        visitAttendance: (b as any).visitAttendance ?? null,
        length: (b as any).length ?? null,
        seanceLength:
          typeof (b as any).seanceLength === 'number'
            ? (b as any).seanceLength
            : typeof durationMin === 'number'
              ? durationMin * 60
              : null,
        isDeleted: (b as any).isDeleted ?? (b as any).deleted ?? null,
        staff: (b as any).staff ?? null,
        client: (b as any).client ?? null,
        services: (b as any).services ?? null,
        documents: (b as any).documents ?? null,
        goodsTransactions: (b as any).goodsTransactions ?? null,
        raw: (b as any).raw ?? b ?? null,
      } as AltegioBooking;
    });
  }

  private prepareEasyweekPayload(bookings: Array<EasyWeekBooking | Record<string, any>>): EasyWeekBooking[] {
    return (bookings ?? []).map((b) => {
      const links = Array.isArray((b as any).links) ? (b as any).links : [];
      const duration = (b as any).duration ?? null;
      const orderedServices = Array.isArray((b as any).orderedServices) ? (b as any).orderedServices : [];
      const order = (b as any).order ?? null;

      return {
        uuid: (b as any).uuid ?? (b as any).externalId ?? '',
        locationUuid: (b as any).locationUuid ?? (b as any).location_uuid ?? null,
        startTime: (b as any).startTime ?? (b as any).start_time ?? null,
        endTime: (b as any).endTime ?? (b as any).end_time ?? null,
        timezone: (b as any).timezone ?? null,
        isCanceled: (b as any).isCanceled ?? (b as any).is_canceled ?? undefined,
        isCompleted: (b as any).isCompleted ?? (b as any).is_completed ?? undefined,
        statusName: (b as any).statusName ?? (b as any).status?.name ?? null,
        publicNotes: (b as any).publicNotes ?? (b as any).public_notes ?? null,
        orderedServices,
        order,
        duration,
        policy: (b as any).policy ?? null,
        links,
        raw: (b as any).raw ?? b ?? null,
      } as EasyWeekBooking;
    });
  }
}
