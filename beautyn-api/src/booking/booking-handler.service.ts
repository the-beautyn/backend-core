import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CrmType } from '@crm/shared';
import type { EasyWeekBooking } from '@crm/provider-core/easyweek/bookings';
import type { AltegioBooking } from '@crm/provider-core/altegio/bookings';
import type { EasyweekBookingDtoNormalized } from '../crm-integration/core/dto/easyweek-booking.dto';
import { PrismaService } from '../shared/database/prisma.service';

type NormalizedEasyweek = {
  bookingUuid: string;
  locationUuid?: string | null;
  startTime: string;
  endTime?: string | null;
  timezone?: string | null;
  isCanceled?: boolean;
  isCompleted?: boolean;
  statusName?: string | null;
  orderedServices?: any[];
  order?: any;
  duration?: any;
  policy?: any;
  links?: any;
  comment?: string | null;
  raw?: any;
};

@Injectable()
export class BookingHandlerService {
  constructor(private readonly prisma: PrismaService) {}

  async createEasyweekBooking(params: {
    salonId: string;
    booking: EasyWeekBooking | EasyweekBookingDtoNormalized;
    workspaceSlug?: string;
    userId?: string | null;
  }): Promise<{ booking: any; changed: boolean }> {
    const normalized = this.normalizeEasyweekInput(params.booking);
    if (!normalized?.bookingUuid || !normalized.startTime) {
      throw new BadRequestException('EasyWeek booking is missing id or start time');
    }

    const bookingKey = { crmType_crmRecordId: { crmType: CrmType.EASYWEEK, crmRecordId: normalized.bookingUuid } };
    const existing = await this.prisma.booking.findUnique({ where: bookingKey, select: { id: true } });
    if (existing?.id) {
      return this.handleEasyweekBooking({ booking: params.booking });
    }

    const start = this.toDate(normalized.startTime);
    if (!start) {
      throw new BadRequestException('EasyWeek booking start_time is invalid');
    }
    const end = this.toDate(normalized.endTime ?? null);
    const status = normalized.isCanceled ? 'canceled' : normalized.isCompleted ? 'completed' : 'created';
    const payload = normalized.raw ?? normalized;
    const shortLink = params.workspaceSlug ? this.buildShortLink(params.workspaceSlug, normalized.bookingUuid) : null;

    const incoming = this.buildEasyweekIncomingState({
      salonId: params.salonId,
      userId: params.userId ?? null,
      status,
      datetime: start,
      endDatetime: end,
      comment: normalized.comment ?? null,
      crmRecordId: normalized.bookingUuid,
      crmCompanyId: normalized.locationUuid ?? null,
      shortLink,
      crmPayload: payload,
      links: Array.isArray(normalized.links) ? normalized.links : [],
      orderedServices: Array.isArray(normalized.orderedServices) ? normalized.orderedServices : [],
      order: normalized.order ?? null,
      duration: normalized.duration ?? null,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          salonId: params.salonId,
          userId: params.userId ?? null,
          status,
          datetime: start,
          endDatetime: end ?? null,
          crmType: CrmType.EASYWEEK,
          crmRecordId: normalized.bookingUuid,
          crmCompanyId: normalized.locationUuid ?? null,
          comment: normalized.comment ?? null,
          crmPayload: payload,
          crmServiceIds: [],
          serviceIds: [],
          shortLink,
          version: 1,
        },
      });

      await this.persistEasyweekDetails(tx, booking.id, incoming);

      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          version: 1,
          remoteUpdatedAt: normalized.raw?.updated_at ?? null,
          payload: incoming.snapshot as any,
          diffFromPrev: Prisma.DbNull,
        },
      });

      return booking;
    });

    return { booking: created, changed: true };
  }

  async handleEasyweekBooking(params: { booking: EasyWeekBooking | EasyweekBookingDtoNormalized }): Promise<{ booking: any; changed: boolean }> {
    const normalized = this.normalizeEasyweekInput(params.booking);
    if (!normalized?.bookingUuid || !normalized.startTime) {
      throw new BadRequestException('EasyWeek booking is missing id or start time');
    }

    const bookingKey = { crmType_crmRecordId: { crmType: CrmType.EASYWEEK, crmRecordId: normalized.bookingUuid } };
    const existing = await this.prisma.booking.findUnique({
      where: bookingKey,
      include: {
        easyweekDetails: {
          include: { links: true, duration: true, orderedServices: true, order: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Booking not found');
    }

    const start = this.toDate(normalized.startTime);
    if (!start) {
      throw new BadRequestException('EasyWeek booking start_time is invalid');
    }
    const end = this.toDate(normalized.endTime ?? null);
    const status = normalized.isCanceled ? 'canceled' : normalized.isCompleted ? 'completed' : 'created';
    const payload = normalized.raw ?? normalized;

    const incoming = this.buildEasyweekIncomingState({
      salonId: existing.salonId,
      userId: existing.userId ?? null,
      status,
      datetime: start,
      endDatetime: end,
      comment: normalized.comment ?? null,
      crmRecordId: normalized.bookingUuid,
      crmCompanyId: normalized.locationUuid ?? null,
      shortLink: existing.shortLink ?? null,
      crmPayload: payload,
      links: Array.isArray(normalized.links) ? normalized.links : [],
      orderedServices: Array.isArray(normalized.orderedServices) ? normalized.orderedServices : [],
      order: normalized.order ?? null,
      duration: normalized.duration ?? null,
    });

    const existingSnapshot = this.buildEasyweekExistingState(existing);
    if (this.isEqual(existingSnapshot.snapshot, incoming.snapshot)) {
      return { booking: existing, changed: false };
    }

    const nextVersion = (existing.version ?? 0) + 1;
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: existing.id },
        data: {
          userId: existing.userId ?? null,
          status,
          datetime: start,
          endDatetime: end ?? null,
          crmCompanyId: normalized.locationUuid ?? null,
          comment: normalized.comment ?? null,
          crmPayload: payload,
          crmServiceIds: [],
          serviceIds: [],
          shortLink: existing.shortLink ?? null,
          version: nextVersion,
        },
      });

      await this.persistEasyweekDetails(tx, existing.id, incoming);

      await tx.bookingHistory.create({
        data: {
          bookingId: existing.id,
          version: nextVersion,
          remoteUpdatedAt: normalized.raw?.updated_at ?? null,
          payload: incoming.snapshot as any,
          diffFromPrev: this.diff(existingSnapshot.snapshot, incoming.snapshot) as any,
        },
      });
    });

    return { booking: existing, changed: true };
  }

  async createAltegioBooking(params: {
    salonId: string;
    booking: AltegioBooking;
    userId?: string | null;
  }): Promise<{ booking: any; changed: boolean }> {
    const crmRecordId = this.extractAltegioRecordId(params.booking);
    const bookingKey = { crmType_crmRecordId: { crmType: CrmType.ALTEGIO, crmRecordId } };
    const existing = await this.prisma.booking.findUnique({ where: bookingKey, select: { id: true } });
    if (existing?.id) {
      return this.handleAltegioBooking({ booking: params.booking });
    }

    const start = this.toDate(params.booking?.datetime ?? params.booking?.date ?? null);
    if (!start) {
      throw new BadRequestException('Altegio booking datetime is invalid');
    }
    const durationMin = this.resolveDurationMin(params.booking);
    const end = durationMin ? new Date(start.getTime() + durationMin * 60 * 1000) : null;
    const status = params.booking?.isDeleted ? 'deleted' : 'created';
    const payload = params.booking?.raw ?? params.booking ?? null;

    const incoming = await this.buildAltegioIncomingState({
      salonId: params.salonId,
      userId: params.userId ?? null,
      status,
      datetime: start,
      endDatetime: end,
      comment: params.booking?.comment ?? null,
      crmRecordId,
      crmCompanyId: params.booking?.companyId ?? null,
      crmStaffId: params.booking?.staffId ? String(params.booking.staffId) : null,
      payload,
      booking: params.booking,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          salonId: params.salonId,
          userId: params.userId ?? null,
          status,
          datetime: start,
          endDatetime: end,
          crmType: CrmType.ALTEGIO,
          crmRecordId,
          crmCompanyId: params.booking?.companyId ?? null,
          crmStaffId: params.booking?.staffId ? String(params.booking.staffId) : null,
          workerId: incoming.workerId ?? null,
          crmServiceIds: incoming.crmServiceIds ?? Prisma.DbNull,
          serviceIds: incoming.serviceIds ?? Prisma.DbNull,
          shortLink: params.booking?.raw?.short_link ?? null,
          crmPayload: payload,
          version: 1,
        },
      });

      await this.persistAltegioDetails(tx, booking.id, incoming);

      await tx.bookingHistory.create({
        data: {
          bookingId: booking.id,
          version: 1,
          remoteUpdatedAt: params.booking?.raw?.last_change_date ?? null,
          payload: incoming.snapshot as any,
          diffFromPrev: Prisma.DbNull,
        },
      });

      return booking;
    });

    return { booking: created, changed: true };
  }

  async handleAltegioBooking(params: { booking: AltegioBooking }): Promise<{ booking: any; changed: boolean }> {
    const crmRecordId = this.extractAltegioRecordId(params.booking);
    const bookingKey = { crmType_crmRecordId: { crmType: CrmType.ALTEGIO, crmRecordId } };
    const existing = await this.prisma.booking.findUnique({
      where: bookingKey,
      include: {
        altegioDetails: {
          include: { staff: true, client: true, services: true, documents: true, goodsTransactions: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Booking not found');
    }

    const start = this.toDate(params.booking?.datetime ?? params.booking?.date ?? null);
    if (!start) {
      throw new BadRequestException('Altegio booking datetime is invalid');
    }
    const durationMin = this.resolveDurationMin(params.booking);
    const end = durationMin ? new Date(start.getTime() + durationMin * 60 * 1000) : null;
    const status = params.booking?.isDeleted ? 'deleted' : 'created';
    const payload = params.booking?.raw ?? params.booking ?? null;

    const incoming = await this.buildAltegioIncomingState({
      salonId: existing.salonId,
      userId: existing.userId ?? null,
      status,
      datetime: start,
      endDatetime: end,
      comment: params.booking?.comment ?? null,
      crmRecordId,
      crmCompanyId: params.booking?.companyId ?? null,
      crmStaffId: params.booking?.staffId ? String(params.booking.staffId) : null,
      payload,
      booking: params.booking,
    });

    const existingSnapshot = this.buildAltegioExistingState(existing);
    if (this.isEqual(existingSnapshot.snapshot, incoming.snapshot)) {
      return { booking: existing, changed: false };
    }

    const nextVersion = (existing.version ?? 0) + 1;
    await this.prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: existing.id },
        data: {
          userId: existing.userId ?? null,
          status,
          datetime: start,
          endDatetime: end,
          crmCompanyId: params.booking?.companyId ?? null,
          crmStaffId: params.booking?.staffId ? String(params.booking.staffId) : null,
          workerId: incoming.workerId ?? null,
          crmServiceIds: incoming.crmServiceIds ?? Prisma.DbNull,
          serviceIds: incoming.serviceIds ?? Prisma.DbNull,
          shortLink: params.booking?.raw?.short_link ?? null,
          comment: params.booking?.comment ?? null,
          crmPayload: payload,
          version: nextVersion,
        },
      });

      await this.persistAltegioDetails(tx, existing.id, incoming);

      await tx.bookingHistory.create({
        data: {
          bookingId: existing.id,
          version: nextVersion,
          remoteUpdatedAt: params.booking?.raw?.last_change_date ?? null,
          payload: incoming.snapshot as any,
          diffFromPrev: this.diff(existingSnapshot.snapshot, incoming.snapshot) as any,
        },
      });
    });

    return { booking: existing, changed: true };
  }

  private normalizeEasyweekInput(input: EasyWeekBooking | EasyweekBookingDtoNormalized): NormalizedEasyweek {
    if ((input as EasyweekBookingDtoNormalized)?.bookingUuid) {
      const dto = input as EasyweekBookingDtoNormalized;
      return {
        bookingUuid: String(dto.bookingUuid),
        locationUuid: dto.locationUuid ?? null,
        startTime: dto.startTime ?? '',
        endTime: dto.endTime ?? null,
        timezone: dto.timezone ?? null,
        isCanceled: dto.isCanceled ?? undefined,
        isCompleted: dto.isCompleted ?? undefined,
        statusName: dto.statusName ?? null,
        orderedServices: dto.orderedServices ?? [],
        order: dto.order ?? null,
        duration: dto.duration ?? null,
        policy: dto.policy ?? null,
        links: dto.links ?? null,
        comment: dto.comment ?? null,
        raw: dto.raw ?? null,
      };
    }

    const booking = input as EasyWeekBooking;
    return {
      bookingUuid: String(booking.uuid ?? (booking as any).externalId ?? ''),
      locationUuid: booking.locationUuid ?? null,
      startTime: booking.startTime ?? '',
      endTime: booking.endTime ?? null,
      timezone: booking.timezone ?? null,
      isCanceled: booking.isCanceled ?? undefined,
      isCompleted: booking.isCompleted ?? undefined,
      statusName: booking.statusName ?? null,
      orderedServices: booking.orderedServices ?? [],
      order: booking.order ?? null,
      duration: booking.duration ?? null,
      policy: booking.policy ?? null,
      links: booking.links ?? null,
      comment: booking.publicNotes ?? null,
      raw: booking.raw ?? null,
    };
  }

  private buildEasyweekIncomingState(args: {
    salonId: string;
    userId: string | null;
    status: string;
    datetime: Date;
    endDatetime: Date | null;
    comment: string | null;
    crmRecordId: string;
    crmCompanyId: string | null;
    shortLink: string | null;
    crmPayload: any;
    links: any[];
    orderedServices: any[];
    order: any;
    duration: any;
  }) {
    const mappedDuration = this.mapEasyweekDuration(args.duration);
    const mappedOrder = this.mapEasyweekOrder(args.order);
    const mappedLinks = this.mapEasyweekLinks(args.links);
    const mappedServices = this.mapEasyweekOrderedServices(args.orderedServices);

    const snapshot = this.normalizeSnapshot({
      booking: {
        salonId: args.salonId,
        userId: args.userId ?? null,
        status: args.status,
        datetime: args.datetime,
        endDatetime: args.endDatetime,
        comment: args.comment ?? null,
        crmType: CrmType.EASYWEEK,
        crmRecordId: args.crmRecordId,
        crmCompanyId: args.crmCompanyId ?? null,
        crmStaffId: null,
        crmServiceIds: null,
        serviceIds: null,
        shortLink: args.shortLink ?? null,
        crmPayload: args.crmPayload ?? null,
      },
    });

    return {
      snapshot,
      rawPayload: args.crmPayload ?? null,
      duration: mappedDuration,
      order: mappedOrder,
      links: mappedLinks,
      orderedServices: mappedServices,
    };
  }

  private buildEasyweekExistingState(existing: any) {
    const details = existing?.easyweekDetails ?? null;
    const snapshot = this.normalizeSnapshot({
      booking: {
        salonId: existing.salonId,
        userId: existing.userId ?? null,
        status: existing.status,
        datetime: existing.datetime,
        endDatetime: existing.endDatetime ?? null,
        comment: existing.comment ?? null,
        crmType: existing.crmType,
        crmRecordId: existing.crmRecordId ?? null,
        crmCompanyId: existing.crmCompanyId ?? null,
        crmStaffId: existing.crmStaffId ?? null,
        crmServiceIds: this.normalizeJsonArray(existing.crmServiceIds),
        serviceIds: this.normalizeJsonArray(existing.serviceIds),
        shortLink: existing.shortLink ?? null,
        crmPayload: existing.crmPayload ?? null,
      },
    });

    return { snapshot };
  }

  private async buildAltegioIncomingState(args: {
    salonId: string;
    userId: string | null;
    status: string;
    datetime: Date;
    endDatetime: Date | null;
    comment: string | null;
    crmRecordId: string;
    crmCompanyId: string | null;
    crmStaffId: string | null;
    payload: any;
    booking: AltegioBooking;
  }) {
    const staffId = args.crmStaffId;
    const serviceExternalIds = this.extractAltegioServiceIds(args.booking?.services);
    const workerId = staffId ? await this.resolveWorkerId(CrmType.ALTEGIO, staffId) : null;
    const serviceIds = serviceExternalIds.length ? await this.resolveServiceIds(CrmType.ALTEGIO, serviceExternalIds) : [];

    const mappedDetails = this.mapAltegioDetails(args.booking?.raw ?? args.booking ?? null);
    const mappedStaff = this.mapAltegioStaff(args.booking?.staff ?? args.booking?.raw?.staff ?? null);
    const mappedClient = this.mapAltegioClient(args.booking?.client ?? args.booking?.raw?.client ?? null);
    const mappedServices = this.mapAltegioServices(args.booking?.services ?? args.booking?.raw?.services ?? null);
    const mappedDocuments = this.mapAltegioDocuments(args.booking?.documents ?? args.booking?.raw?.documents ?? null);
    const mappedGoods = this.mapAltegioGoods(args.booking?.goodsTransactions ?? args.booking?.raw?.goods_transactions ?? null);

    const snapshot = this.normalizeSnapshot({
      booking: {
        salonId: args.salonId,
        userId: args.userId ?? null,
        status: args.status,
        datetime: args.datetime,
        endDatetime: args.endDatetime,
        comment: args.comment ?? null,
        crmType: CrmType.ALTEGIO,
        crmRecordId: args.crmRecordId,
        crmCompanyId: args.crmCompanyId ?? null,
        crmStaffId: args.crmStaffId ?? null,
        workerId,
        crmServiceIds: serviceExternalIds.length ? serviceExternalIds : null,
        serviceIds: serviceIds.length ? serviceIds : null,
        shortLink: args.booking?.raw?.short_link ?? null,
        crmPayload: args.payload ?? null,
      },
    });

    return {
      snapshot,
      details: mappedDetails,
      staff: mappedStaff,
      client: mappedClient,
      services: mappedServices,
      documents: mappedDocuments,
      goodsTransactions: mappedGoods,
      crmServiceIds: serviceExternalIds.length ? serviceExternalIds : null,
      serviceIds: serviceIds.length ? serviceIds : null,
      workerId,
    };
  }

  private buildAltegioExistingState(existing: any) {
    const details = existing?.altegioDetails ?? null;
    const snapshot = this.normalizeSnapshot({
      booking: {
        salonId: existing.salonId,
        userId: existing.userId ?? null,
        status: existing.status,
        datetime: existing.datetime,
        endDatetime: existing.endDatetime ?? null,
        comment: existing.comment ?? null,
        crmType: existing.crmType,
        crmRecordId: existing.crmRecordId ?? null,
        crmCompanyId: existing.crmCompanyId ?? null,
        crmStaffId: existing.crmStaffId ?? null,
        workerId: existing.workerId ?? null,
        crmServiceIds: this.normalizeJsonArray(existing.crmServiceIds),
        serviceIds: this.normalizeJsonArray(existing.serviceIds),
        shortLink: existing.shortLink ?? null,
        crmPayload: existing.crmPayload ?? null,
      },
    });

    return { snapshot };
  }

  private async persistEasyweekDetails(tx: Prisma.TransactionClient, bookingId: string, state: any) {
    await tx.easyweekBookingDetails.upsert({
      where: { bookingId },
      update: { rawPayload: state.rawPayload ?? null },
      create: { bookingId, rawPayload: state.rawPayload ?? null },
    });

    await tx.easyweekBookingDuration.deleteMany({ where: { detailsId: bookingId } });
    if (state.duration) {
      await tx.easyweekBookingDuration.create({
        data: { detailsId: bookingId, ...state.duration },
      });
    }

    await tx.easyweekBookingLink.deleteMany({ where: { detailsId: bookingId } });
    if (state.links.length) {
      await tx.easyweekBookingLink.createMany({ data: state.links.map((l: any) => ({ detailsId: bookingId, ...l })) });
    }

    await tx.easyweekOrderedService.deleteMany({ where: { detailsId: bookingId } });
    if (state.orderedServices.length) {
      await tx.easyweekOrderedService.createMany({
        data: state.orderedServices.map((s: any) => ({ detailsId: bookingId, ...s })),
      });
    }

    await tx.easyweekBookingOrder.deleteMany({ where: { detailsId: bookingId } });
    if (state.order) {
      await tx.easyweekBookingOrder.create({
        data: { detailsId: bookingId, payload: state.order.payload ?? Prisma.DbNull, ...state.order },
      });
    }
  }

  private async persistAltegioDetails(tx: Prisma.TransactionClient, bookingId: string, state: any) {
    await tx.altegioBookingDetails.upsert({
      where: { bookingId },
      update: state.details,
      create: { bookingId, ...state.details },
    });

    await tx.altegioBookingStaff.upsert({
      where: { detailsId: bookingId },
      update: state.staff ?? {},
      create: { detailsId: bookingId, ...(state.staff ?? {}) },
    });

    await tx.altegioBookingClient.upsert({
      where: { detailsId: bookingId },
      update: state.client ?? {},
      create: { detailsId: bookingId, ...(state.client ?? {}) },
    });

    await tx.altegioBookingService.deleteMany({ where: { detailsId: bookingId } });
    if (state.services.length) {
      await tx.altegioBookingService.createMany({
        data: state.services.map((s: any) => ({ detailsId: bookingId, ...s })),
      });
    }

    await tx.altegioBookingDocument.deleteMany({ where: { detailsId: bookingId } });
    if (state.documents.length) {
      await tx.altegioBookingDocument.createMany({
        data: state.documents.map((d: any) => ({ detailsId: bookingId, ...d })),
      });
    }

    await tx.altegioBookingGoodsTransaction.deleteMany({ where: { detailsId: bookingId } });
    if (state.goodsTransactions.length) {
      await tx.altegioBookingGoodsTransaction.createMany({
        data: state.goodsTransactions.map((g: any) => ({ detailsId: bookingId, ...g })),
      });
    }
  }

  private mapEasyweekDuration(duration: any) {
    if (!duration || typeof duration !== 'object') return null;
    return {
      value: this.toNumber(duration.value),
      label: duration.label ?? null,
      iso8601: duration.iso_8601 ?? duration.iso ?? null,
    };
  }

  private mapEasyweekOrder(order: any) {
    if (!order || typeof order !== 'object') return null;
    return {
      payload: order ?? null,
      tax: Array.isArray(order.tax) ? order.tax : null,
      subtotal: this.toNumber(order.subtotal),
      subtotalFormatted: order.subtotal_formatted ?? null,
      amountPaid: this.toNumber(order.amount_paid),
      amountPaidFormatted: order.amount_paid_formatted ?? null,
      total: this.toNumber(order.total),
      totalFormatted: order.total_formatted ?? null,
    };
  }

  private mapEasyweekLinks(links: any[]) {
    const mapped = (links ?? [])
      .map((link: any) => {
        if (!link || typeof link !== 'object') return null;
        const url = link.link ?? link.url ?? null;
        if (!url) return null;
        return {
          type: link.type ?? null,
          url: String(url),
        };
      })
      .filter((v): v is NonNullable<typeof v> => !!v);
    return this.sortByKey(mapped, (l) => `${l.type ?? ''}|${l.url}`);
  }

  private mapEasyweekOrderedServices(services: any[]) {
    const mapped = (services ?? [])
      .map((svc: any) => {
        if (!svc || typeof svc !== 'object') return null;
        const reservedOn = this.toDate(
          svc.reserved_on ?? svc.reservedOn ?? svc.start_time ?? svc.startTime,
        );
        const reservedUntil = this.toDate(
          svc.reserved_until ?? svc.reservedUntil ?? svc.end_time ?? svc.endTime,
        );
        const duration = svc.duration ?? {};
        const originalDuration = svc.original_duration ?? svc.originalDuration ?? {};
        return {
          externalUuid: svc.externalUuid ?? svc.uuid ?? svc.id ?? null,
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
          durationValue: this.toNumber(svc.durationValue ?? duration.value),
          durationLabel: svc.durationLabel ?? duration.label ?? null,
          durationIso: svc.durationIso ?? duration.iso_8601 ?? duration.iso ?? null,
          originalDurationValue: this.toNumber(svc.originalDurationValue ?? originalDuration.value),
          originalDurationLabel: svc.originalDurationLabel ?? originalDuration.label ?? null,
          originalDurationIso: svc.originalDurationIso ?? originalDuration.iso_8601 ?? originalDuration.iso ?? null,
        };
      })
      .filter((v): v is NonNullable<typeof v> => !!v);
    return this.sortByKey(mapped, (s) => `${s.externalUuid ?? ''}|${s.reservedOn ?? ''}|${s.name ?? ''}`);
  }

  private mapAltegioDetails(data: any) {
    if (!data || typeof data !== 'object') return { rawPayload: data ?? null };
    return {
      crmRecordId: data.id ? String(data.id) : data.crmRecordId ?? null,
      companyId: data.company_id ? String(data.company_id) : data.companyId ?? null,
      staffId: data.staff_id ? String(data.staff_id) : data.staffId ?? null,
      clientId: data.client?.id ? String(data.client.id) : data.clientId ?? null,
      datetime: this.toDate(data.datetime),
      date: this.toDate(data.date),
      createDate: this.toDate(data.create_date),
      comment: data.comment ?? null,
      online: data.online ?? null,
      attendance: this.toNumber(data.attendance),
      visitAttendance: this.toNumber(data.visit_attendance ?? data.visitAttendance),
      confirmed: this.toNumber(data.confirmed),
      seanceLength: this.toNumber(data.seance_length ?? data.seanceLength),
      length: this.toNumber(data.length),
      technicalBreak: this.toNumber(data.technical_break_duration ?? data.technicalBreak),
      smsBefore: this.toNumber(data.sms_before ?? data.smsBefore),
      smsNow: this.toNumber(data.sms_now ?? data.smsNow),
      emailNow: this.toNumber(data.email_now ?? data.emailNow),
      notified: this.toNumber(data.notified),
      masterRequest: this.toNumber(data.master_request ?? data.masterRequest),
      apiId: data.api_id ?? data.apiId ?? null,
      fromUrl: data.from_url ?? data.fromUrl ?? null,
      reviewRequested: this.toNumber(data.review_requested ?? data.reviewRequested),
      visitId: data.visit_id ? String(data.visit_id) : data.visitId ?? null,
      createdUserId: data.created_user_id ? String(data.created_user_id) : data.createdUserId ?? null,
      deleted: data.deleted ?? null,
      paidFull: this.toNumber(data.paid_full ?? data.paidFull),
      prepaid: data.prepaid ?? null,
      prepaidConfirmed: data.prepaid_confirmed ?? data.prepaidConfirmed ?? null,
      isUpdateBlocked: data.is_update_blocked ?? data.isUpdateBlocked ?? null,
      lastChangeDate: this.toDate(data.last_change_date ?? data.lastChangeDate),
      customColor: data.custom_color ?? data.customColor ?? null,
      customFontColor: data.custom_font_color ?? data.customFontColor ?? null,
      smsRemainHours: this.toNumber(data.sms_remain_hours ?? data.smsRemainHours),
      emailRemainHours: this.toNumber(data.email_remain_hours ?? data.emailRemainHours),
      bookformId: this.toNumber(data.bookform_id ?? data.bookformId),
      recordFrom: data.record_from ?? data.recordFrom ?? null,
      isMobile: this.toNumber(data.is_mobile ?? data.isMobile),
      shortLink: data.short_link ?? data.shortLink ?? null,
      rawPayload: data ?? null,
    };
  }

  private mapAltegioStaff(staff: any) {
    if (!staff || typeof staff !== 'object') {
      return { externalId: null, apiId: null, name: null, specialization: null, position: null, avatar: null, avatarBig: null, rating: null, votesCount: null };
    }
    return {
      externalId: staff.id ? String(staff.id) : staff.externalId ?? null,
      apiId: staff.api_id ? String(staff.api_id) : staff.apiId ?? null,
      name: staff.name ?? null,
      specialization: staff.specialization ?? null,
      position: staff.position ?? null,
      avatar: staff.avatar ?? null,
      avatarBig: staff.avatar_big ?? staff.avatarBig ?? null,
      rating: staff.rating ?? null,
      votesCount: this.toNumber(staff.votes_count ?? staff.votesCount),
    };
  }

  private mapAltegioClient(client: any) {
    if (!client || typeof client !== 'object') {
      return { externalId: null, name: null, surname: null, patronymic: null, displayName: null, comment: null, phone: null, card: null, email: null, successVisits: null, failVisits: null, discount: null, sex: null, birthday: null, clientTags: null, customFields: null };
    }
    return {
      externalId: client.id ? String(client.id) : client.externalId ?? null,
      name: client.name ?? null,
      surname: client.surname ?? null,
      patronymic: client.patronymic ?? null,
      displayName: client.display_name ?? client.displayName ?? null,
      comment: client.comment ?? null,
      phone: client.phone ?? null,
      card: client.card ?? null,
      email: client.email ?? null,
      successVisits: this.toNumber(client.success_visits_count ?? client.successVisits),
      failVisits: this.toNumber(client.fail_visits_count ?? client.failVisits),
      discount: this.toNumber(client.discount),
      sex: this.toNumber(client.sex),
      birthday: client.birthday ?? null,
      clientTags: client.client_tags ?? client.clientTags ?? null,
      customFields: client.custom_fields ?? client.customFields ?? null,
    };
  }

  private mapAltegioServices(services: any) {
    if (!Array.isArray(services)) return [];
    const mapped = services.map((s: any) => ({
      externalId: s?.id ? String(s.id) : s?.externalId ?? null,
      title: s?.title ?? null,
      cost: this.toNumber(s?.cost),
      costToPay: this.toNumber(s?.cost_to_pay ?? s?.costToPay),
      manualCost: this.toNumber(s?.manual_cost ?? s?.manualCost),
      costPerUnit: this.toNumber(s?.cost_per_unit ?? s?.costPerUnit),
      discount: this.toNumber(s?.discount),
      firstCost: this.toNumber(s?.first_cost ?? s?.firstCost),
      amount: this.toNumber(s?.amount),
    }));
    return this.sortByKey(mapped, (s) => `${s.externalId ?? ''}|${s.title ?? ''}`);
  }

  private mapAltegioDocuments(docs: any) {
    if (!Array.isArray(docs)) return [];
    const mapped = docs.map((d: any) => ({
      externalId: d?.id ? String(d.id) : d?.externalId ?? null,
      typeId: this.toNumber(d?.type_id ?? d?.typeId),
      storageId: this.toNumber(d?.storage_id ?? d?.storageId),
      userId: this.toNumber(d?.user_id ?? d?.userId),
      companyId: this.toNumber(d?.company_id ?? d?.companyId),
      number: this.toNumber(d?.number),
      comment: d?.comment ?? null,
      dateCreated: this.toDate(d?.date_created ?? d?.dateCreated),
      categoryId: this.toNumber(d?.category_id ?? d?.categoryId),
      visitId: d?.visit_id ? String(d.visit_id) : d?.visitId ?? null,
      recordId: d?.record_id ? String(d.record_id) : d?.recordId ?? null,
      typeTitle: d?.type_title ?? d?.typeTitle ?? null,
      isSaleBillPrinted: d?.is_sale_bill_printed ?? d?.isSaleBillPrinted ?? null,
    }));
    return this.sortByKey(mapped, (d) => `${d.externalId ?? ''}|${d.number ?? ''}`);
  }

  private mapAltegioGoods(goods: any) {
    if (!Array.isArray(goods)) return [];
    const mapped = goods.map((g: any) => ({
      externalId: g?.id ? String(g.id) : g?.externalId ?? null,
      typeId: this.toNumber(g?.type_id ?? g?.typeId),
      storageId: this.toNumber(g?.storage_id ?? g?.storageId),
      userId: this.toNumber(g?.user_id ?? g?.userId),
      companyId: this.toNumber(g?.company_id ?? g?.companyId),
      number: this.toNumber(g?.number),
      comment: g?.comment ?? null,
      dateCreated: this.toDate(g?.date_created ?? g?.dateCreated),
      categoryId: this.toNumber(g?.category_id ?? g?.categoryId),
      visitId: g?.visit_id ? String(g.visit_id) : g?.visitId ?? null,
      recordId: g?.record_id ? String(g.record_id) : g?.recordId ?? null,
      typeTitle: g?.type_title ?? g?.typeTitle ?? null,
      isSaleBillPrinted: g?.is_sale_bill_printed ?? g?.isSaleBillPrinted ?? null,
    }));
    return this.sortByKey(mapped, (d) => `${d.externalId ?? ''}|${d.number ?? ''}`);
  }

  private extractAltegioServiceIds(services: any): string[] {
    if (!Array.isArray(services)) return [];
    return services
      .map((s) => s?.id ?? s?.externalId ?? null)
      .filter((id): id is string | number => id !== null && id !== undefined)
      .map((id) => String(id));
  }

  private async resolveWorkerId(provider: CrmType, externalId: string): Promise<string | null> {
    const mapping = await this.prisma.workerMapping.findUnique({
      where: { provider_externalId: { provider, externalId } },
      select: { workerId: true },
    });
    return mapping?.workerId ?? null;
  }

  private async resolveServiceIds(provider: CrmType, externalIds: string[]): Promise<string[]> {
    if (!externalIds.length) return [];
    const mappings = await this.prisma.serviceMapping.findMany({
      where: { provider, externalId: { in: externalIds } },
      select: { serviceId: true },
    });
    return mappings.map((m: any) => m.serviceId).filter((id: string | null) => !!id);
  }

  private resolveDurationMin(booking: AltegioBooking): number | null {
    if (typeof booking?.seanceLength === 'number') return Math.round(booking.seanceLength / 60);
    if (typeof booking?.length === 'number') return Math.round(booking.length / 60);
    return null;
  }

  private extractAltegioRecordId(booking: AltegioBooking): string {
    const externalId = booking?.crmRecordId ?? booking?.raw?.id ?? booking?.raw?.recordId ?? null;
    if (!externalId) {
      throw new BadRequestException('Altegio booking is missing crmRecordId');
    }
    return String(externalId);
  }

  private normalizeSnapshot(snapshot: any) {
    return this.normalizeValue(snapshot);
  }

  private normalizeValue(value: any): any {
    if (value === undefined) return null;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map((v) => this.normalizeValue(v));
    if (value && typeof value === 'object') {
      const keys = Object.keys(value).sort();
      const result: Record<string, any> = {};
      for (const key of keys) {
        result[key] = this.normalizeValue(value[key]);
      }
      return result;
    }
    return value;
  }

  private normalizeJsonArray(value: any): any {
    if (!Array.isArray(value) || value.length === 0) return null;
    return value;
  }

  private isEqual(prev: any, next: any): boolean {
    return JSON.stringify(prev ?? null) === JSON.stringify(next ?? null);
  }

  private diff(prev: Record<string, any> | null, next: Record<string, any>) {
    const removed: string[] = [];
    const added: string[] = [];
    const changed: Record<string, { prev: any; next: any }> = {};

    const prevKeys = new Set(Object.keys(prev ?? {}));
    const nextKeys = new Set(Object.keys(next ?? {}));

    for (const k of prevKeys) {
      if (!nextKeys.has(k)) removed.push(k);
    }
    for (const k of nextKeys) {
      if (!prevKeys.has(k)) added.push(k);
      else if (JSON.stringify((prev as any)?.[k]) !== JSON.stringify((next as any)?.[k])) {
        changed[k] = { prev: (prev as any)?.[k], next: (next as any)?.[k] };
      }
    }
    return { added, removed, changed };
  }

  private toDate(value?: string | number | null): Date | null {
    if (!value && value !== 0) return null;
    const ts = Date.parse(String(value));
    return Number.isFinite(ts) ? new Date(ts) : null;
  }

  private toNumber(value: any): number | null {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private sortByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
    return [...items].sort((a, b) => keyFn(a).localeCompare(keyFn(b)));
  }

  private buildShortLink(workspaceSlug: string, bookingUuid: string): string {
    const slug = workspaceSlug.trim();
    const uuid = bookingUuid.trim();
    return `https://booking.easyweek.com.ua/${slug}/booking/${uuid}`;
  }
}
