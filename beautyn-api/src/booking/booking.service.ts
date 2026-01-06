import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CrmType } from '@crm/shared';
import { PrismaService } from '../shared/database/prisma.service';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';
import { EasyweekBookingDtoNormalized } from '../crm-integration/core/dto/easyweek-booking.dto';

@Injectable()
export class BookingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crmIntegration: CrmIntegrationService,
  ) {}

  async confirmEasyweekBooking(salonId: string, bookingUuid: string, userId?: string) {
    const details = await this.crmIntegration.fetchEasyweekBookingDetails({ salonId, bookingUuid });
    const workspaceSlug = await this.crmIntegration.getEasyweekWorkspaceSlug(salonId);
    const start = this.toDate(details.startTime);
    if (!start) {
      throw new BadRequestException('EasyWeek booking start_time is missing');
    }
    const end = this.toDate(details.endTime);
    const status = details.isCanceled ? 'canceled' : details.isCompleted ? 'completed' : 'created';
    const payload = details.raw ?? details;
    const shortLink = this.buildShortLink(workspaceSlug, bookingUuid);
    const links = Array.isArray(details.links) ? details.links : [];
    const orderedServices = Array.isArray(details.orderedServices) ? details.orderedServices : [];
    const order = (details as any).order ?? undefined;
    const duration = (details as any).duration ?? undefined;

    const booking = await this.prisma.$transaction(async (tx) => {
      const record = await tx.booking.upsert({
        where: { crmType_crmRecordId: { crmType: CrmType.EASYWEEK, crmRecordId: bookingUuid } },
        create: {
          salonId,
          userId: userId ?? null,
          status,
          datetime: start,
          endDatetime: end ?? null,
          crmType: CrmType.EASYWEEK,
          crmRecordId: bookingUuid,
          crmCompanyId: details.locationUuid ?? null,
          crmPayload: payload,
          crmServiceIds: Prisma.JsonNull,
          serviceIds: Prisma.JsonNull,
          shortLink,
        },
        update: {
          userId: userId ?? undefined,
          status,
          datetime: start,
          endDatetime: end ?? null,
          crmType: CrmType.EASYWEEK,
          crmRecordId: bookingUuid,
          crmCompanyId: details.locationUuid ?? undefined,
          crmPayload: payload,
          crmServiceIds: Prisma.JsonNull,
          serviceIds: Prisma.JsonNull,
          shortLink,
        },
      });

      await tx.easyweekBookingExtra.upsert({
        where: { bookingId: record.id },
        update: { orderPayload: order ?? Prisma.JsonNull, rawPayload: payload },
        create: { bookingId: record.id, orderPayload: order ?? Prisma.JsonNull, rawPayload: payload },
      });

      await tx.easyweekBookingDuration.deleteMany({ where: { extraId: record.id } });
      if (duration) {
        await tx.easyweekBookingDuration.create({
          data: { extraId: record.id, ...this.mapDuration(duration) },
        });
      }

      await tx.easyweekBookingLink.deleteMany({ where: { extraId: record.id } });
      if (links.length) {
        await tx.easyweekBookingLink.createMany({
          data: links
            .map((l: any) => this.mapLink(record.id, l))
            .filter((v): v is NonNullable<typeof v> => !!v),
        });
      }

      await tx.easyweekOrderedService.deleteMany({ where: { extraId: record.id } });
      if (orderedServices.length) {
        await tx.easyweekOrderedService.createMany({
          data: orderedServices
            .map((s: any) => this.mapOrderedService(record.id, s))
            .filter((v): v is NonNullable<typeof v> => !!v),
        });
      }

      return record;
    });

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

  private mapDuration(duration: any) {
    if (!duration || typeof duration !== 'object') return {};
    return {
      value: this.toNumber(duration.value),
      label: duration.label ?? null,
      iso8601: duration.iso_8601 ?? duration.iso ?? null,
    };
  }

  private mapLink(extraId: string, link: any) {
    if (!link || typeof link !== 'object' || !link.link) return null;
    return {
      extraId,
      type: link.type ?? null,
      url: String(link.link),
    };
  }

  private mapOrderedService(extraId: string, svc: any) {
    if (!svc || typeof svc !== 'object') return null;
    const reservedOn = this.toDate(svc.reserved_on ?? svc.reservedOn ?? svc.start_time ?? svc.startTime);
    const reservedUntil = this.toDate(svc.reserved_until ?? svc.reservedUntil ?? svc.end_time ?? svc.endTime);
    const duration = svc.duration ?? {};
    const originalDuration = svc.original_duration ?? svc.originalDuration ?? {};
    return {
      extraId,
      externalUuid: svc.uuid ?? svc.id ?? null,
      timezone: svc.timezone ?? null,
      reservedOn,
      reservedUntil,
      quantity: this.toNumber(svc.quantity),
      name: svc.name ?? null,
      description: svc.description ?? null,
      currency: svc.currency ?? null,
      price: this.toNumber(svc.price),
      priceFormatted: svc.price_formatted ?? null,
      discount: this.toNumber(svc.discount),
      discountFormatted: svc.discount_formatted ?? null,
      originalPrice: this.toNumber(svc.original_price),
      originalPriceFormatted: svc.original_price_formatted ?? null,
      durationValue: this.toNumber(duration.value),
      durationLabel: duration.label ?? null,
      durationIso: duration.iso_8601 ?? duration.iso ?? null,
      originalDurationValue: this.toNumber(originalDuration.value),
      originalDurationLabel: originalDuration.label ?? null,
      originalDurationIso: originalDuration.iso_8601 ?? originalDuration.iso ?? null,
    };
  }

  private toDate(value?: string | null): Date | null {
    if (!value || typeof value !== 'string') return null;
    const ts = Date.parse(value);
    return Number.isFinite(ts) ? new Date(ts) : null;
  }

  private toNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private buildShortLink(workspaceSlug: string, bookingUuid: string): string {
    const slug = workspaceSlug.trim();
    const uuid = bookingUuid.trim();
    return `https://booking.easyweek.com.ua/${slug}/booking/${uuid}`;
  }
}
