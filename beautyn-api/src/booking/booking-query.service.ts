import { Injectable } from '@nestjs/common';
import { Prisma, Booking } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { BookingDto, BookingListResponseDto, BookingProviderAltegioDto, BookingProviderEasyweekDto } from './dto/booking.response.dto';

type BookingWithRelations = Booking & {
  worker: { id: string; firstName: string; lastName: string; photoUrl: string | null } | null;
  easyweekDetails: {
    bookingId: string;
    links: Array<{ type: string | null; url: string }>;
    duration: { value: number | null; label: string | null; iso8601: string | null } | null;
    orderedServices: Array<any>;
    order: any | null;
    rawPayload?: Prisma.JsonValue | null;
  } | null;
  altegioDetails: any | null;
  history: Array<{
    version: number;
    syncedAt: Date;
    remoteUpdatedAt: string | null;
    payload: Prisma.JsonValue;
    diffFromPrev: Prisma.JsonValue | null;
  }>;
};

@Injectable()
export class BookingQueryService {
  private readonly include = {
    worker: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
    easyweekDetails: {
      include: {
        links: true,
        duration: true,
        orderedServices: true,
        order: true,
      },
    },
    altegioDetails: {
      include: {
        staff: true,
        client: true,
        services: true,
        documents: true,
        goodsTransactions: true,
      },
    },
    history: {
      orderBy: { version: 'desc' as const },
    },
  } satisfies Prisma.BookingInclude;

  constructor(private readonly prisma: PrismaService) {}

  async getForClient(bookingId: string, userId: string): Promise<BookingDto | null> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, userId },
      include: this.include,
    });
    return booking ? this.mapBooking(booking as unknown as BookingWithRelations, { includeHistory: false }) : null;
  }

  async getForSalon(bookingId: string, salonId: string, includeHistory = true): Promise<BookingDto | null> {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, salonId },
      include: this.include,
    });
    return booking ? this.mapBooking(booking as unknown as BookingWithRelations, { includeHistory }) : null;
  }

  async listForClient(params: {
    userId: string;
    status?: string;
    from?: Date;
    to?: Date;
    cursor?: string;
    limit?: number;
  }): Promise<BookingListResponseDto> {
    const take = this.clampTake(params.limit);
    const where: Prisma.BookingWhereInput = {
      userId: params.userId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.from || params.to
        ? {
            datetime: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };

    const items = await this.prisma.booking.findMany({
      where,
      include: this.include,
      take: take + 1,
      skip: params.cursor ? 1 : 0,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      orderBy: [{ datetime: 'desc' }, { id: 'desc' }],
    });

    const nextCursor = items.length > take ? items[take].id : undefined;
    const slice = items.slice(0, take) as unknown as BookingWithRelations[];
    return {
      items: slice.map((b) => this.mapBooking(b, { includeHistory: false })),
      next_cursor: nextCursor,
      limit: take,
    };
  }

  async listForSalon(params: {
    salonId: string;
    status?: string;
    from?: Date;
    to?: Date;
    cursor?: string;
    limit?: number;
    includeHistory?: boolean;
  }): Promise<BookingListResponseDto> {
    const take = this.clampTake(params.limit);
    const where: Prisma.BookingWhereInput = {
      salonId: params.salonId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.from || params.to
        ? {
            datetime: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };

    const items = await this.prisma.booking.findMany({
      where,
      include: this.include,
      take: take + 1,
      skip: params.cursor ? 1 : 0,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      orderBy: [{ datetime: 'desc' }, { id: 'desc' }],
    });

    const nextCursor = items.length > take ? items[take].id : undefined;
    const slice = items.slice(0, take) as unknown as BookingWithRelations[];
    const includeHistory = params.includeHistory ?? true;
    return {
      items: slice.map((b) => this.mapBooking(b, { includeHistory })),
      next_cursor: nextCursor,
      limit: take,
    };
  }

  async getByIds(ids: string[]): Promise<BookingDto[]> {
    const unique = Array.from(new Set((ids ?? []).filter((id) => typeof id === 'string' && id.length > 0)));
    if (!unique.length) return [];

    const bookings = await this.prisma.booking.findMany({
      where: { id: { in: unique } },
      include: this.include,
    });
    const mapped = new Map<string, BookingDto>(
      (bookings as unknown as BookingWithRelations[]).map((b) => [b.id, this.mapBooking(b)]),
    );
    return unique.map((id) => mapped.get(id)).filter((b): b is BookingDto => !!b);
  }

  private clampTake(limit?: number): number {
    if (!limit || limit <= 0) return 20;
    return Math.min(limit, 100);
  }

  private mapBooking(booking: BookingWithRelations, opts?: { includeHistory?: boolean }): BookingDto {
    const includeHistory = opts?.includeHistory !== false;
    return {
      id: booking.id,
      salon_id: booking.salonId,
      user_id: booking.userId ?? null,
      worker: booking.worker
        ? {
            id: booking.worker.id,
            first_name: booking.worker.firstName,
            last_name: booking.worker.lastName,
            photo_url: booking.worker.photoUrl,
          }
        : null,
      status: booking.status,
      datetime: booking.datetime.toISOString(),
      end_datetime: booking.endDatetime ? booking.endDatetime.toISOString() : null,
      comment: booking.comment ?? null,
      crm_type: booking.crmType ?? null,
      crm_record_id: booking.crmRecordId ?? null,
      crm_company_id: booking.crmCompanyId ?? null,
      crm_staff_id: booking.crmStaffId ?? null,
      crm_service_ids: this.toStringArray(booking.crmServiceIds),
      service_ids: this.toStringArray(booking.serviceIds),
      short_link: booking.shortLink ?? null,
      created_at: booking.createdAt.toISOString(),
      updated_at: booking.updatedAt.toISOString(),
      provider_specific: {
        easyweek: this.mapEasyweek(booking),
        altegio: this.mapAltegio(booking),
      },
      history: includeHistory
        ? Array.isArray(booking.history)
          ? booking.history.map((h) => ({
              version: h.version,
              synced_at: h.syncedAt.toISOString(),
              remote_updated_at: h.remoteUpdatedAt ?? null,
              payload: h.payload ?? null,
              diff_from_prev: h.diffFromPrev ?? null,
            }))
          : undefined
        : undefined,
    };
  }

  private mapEasyweek(booking: BookingWithRelations): BookingProviderEasyweekDto | undefined {
    const details = booking.easyweekDetails;
    if (!details) return undefined;
    const raw = (details as any)?.rawPayload ?? {};
    const isCanceled = raw?.isCanceled ?? raw?.is_canceled;
    const isCompleted = raw?.isCompleted ?? raw?.is_completed;
    const statusName = raw?.statusName ?? raw?.status?.name ?? raw?.status_name;
    const timezone = raw?.timezone ?? raw?.time_zone ?? null;
    return {
      booking_uuid: booking.crmRecordId ?? null,
      location_uuid: booking.crmCompanyId ?? null,
      timezone,
      status_name: statusName ?? null,
      is_canceled: isCanceled ?? undefined,
      is_completed: isCompleted ?? undefined,
      links: (details.links || []).map((l) => ({ type: l.type, url: l.url })),
      duration: details.duration
        ? {
            value: details.duration.value,
            label: details.duration.label,
            iso8601: details.duration.iso8601,
          }
        : undefined,
      ordered_services: (details.orderedServices || []).map((svc: any) => ({
        external_uuid: svc.externalUuid ?? null,
        reserved_on: svc.reservedOn ? svc.reservedOn.toISOString() : null,
        reserved_until: svc.reservedUntil ? svc.reservedUntil.toISOString() : null,
        timezone: svc.timezone ?? null,
        quantity: svc.quantity ?? null,
        name: svc.name ?? null,
        description: svc.description ?? null,
        currency: svc.currency ?? null,
        price: svc.price ?? null,
        price_formatted: svc.priceFormatted ?? null,
        discount: svc.discount ?? null,
        discount_formatted: svc.discountFormatted ?? null,
        original_price: svc.originalPrice ?? null,
        original_price_formatted: svc.originalPriceFormatted ?? null,
        duration_value: svc.durationValue ?? null,
        duration_label: svc.durationLabel ?? null,
        duration_iso: svc.durationIso ?? null,
        original_duration_value: svc.originalDurationValue ?? null,
        original_duration_label: svc.originalDurationLabel ?? null,
        original_duration_iso: svc.originalDurationIso ?? null,
      })),
      order: details.order
        ? {
            tax: details.order.tax ?? undefined,
            subtotal: details.order.subtotal ?? null,
            subtotal_formatted: details.order.subtotalFormatted ?? null,
            amount_paid: details.order.amountPaid ?? null,
            amount_paid_formatted: details.order.amountPaidFormatted ?? null,
            total: details.order.total ?? null,
            total_formatted: details.order.totalFormatted ?? null,
          }
        : undefined,
    };
  }

  private mapAltegio(booking: BookingWithRelations): BookingProviderAltegioDto | undefined {
    const details = booking.altegioDetails as any;
    if (!details) return undefined;
    return {
      crm_record_id: details.crmRecordId ?? booking.crmRecordId ?? null,
      company_id: details.companyId ?? null,
      staff_id: details.staffId ?? null,
      client_id: details.clientId ?? null,
      datetime: details.datetime ? new Date(details.datetime).toISOString() : null,
      date: details.date ? new Date(details.date).toISOString() : null,
      comment: details.comment ?? null,
      attendance: details.attendance ?? null,
      confirmed: details.confirmed ?? null,
      visit_attendance: details.visitAttendance ?? null,
      length: details.length ?? null,
      seance_length: details.seanceLength ?? null,
      is_deleted: details.deleted ?? null,
      staff: details.staff
        ? {
            external_id: details.staff.externalId ?? null,
            api_id: details.staff.apiId ?? null,
            name: details.staff.name ?? null,
            specialization: details.staff.specialization ?? null,
            avatar: details.staff.avatar ?? null,
            avatar_big: details.staff.avatarBig ?? null,
            rating: details.staff.rating ?? null,
            votes_count: details.staff.votesCount ?? null,
          }
        : null,
      client: details.client
        ? {
            external_id: details.client.externalId ?? null,
            display_name: details.client.displayName ?? null,
            phone: details.client.phone ?? null,
            email: details.client.email ?? null,
            discount: details.client.discount ?? null,
          }
        : null,
      services: Array.isArray(details.services)
        ? details.services.map((svc: any) => ({
            external_id: svc.externalId ?? null,
            title: svc.title ?? null,
            cost: svc.cost ?? null,
            cost_to_pay: svc.costToPay ?? null,
            discount: svc.discount ?? null,
          }))
        : undefined,
      documents: Array.isArray(details.documents)
        ? details.documents.map((doc: any) => ({
            external_id: doc.externalId ?? null,
            type_id: doc.typeId ?? null,
            storage_id: doc.storageId ?? null,
            user_id: doc.userId ?? null,
            company_id: doc.companyId ?? null,
            number: doc.number ?? null,
            comment: doc.comment ?? null,
            date_created: doc.dateCreated ? new Date(doc.dateCreated).toISOString() : null,
          }))
        : undefined,
      goods_transactions: Array.isArray(details.goodsTransactions)
        ? details.goodsTransactions.map((tx: any) => ({
            external_id: tx.externalId ?? null,
            type_id: tx.typeId ?? null,
            storage_id: tx.storageId ?? null,
            user_id: tx.userId ?? null,
            company_id: tx.companyId ?? null,
            number: tx.number ?? null,
            comment: tx.comment ?? null,
            date_created: tx.dateCreated ? new Date(tx.dateCreated).toISOString() : null,
          }))
        : undefined,
    };
  }

  private toStringArray(value: Prisma.JsonValue | null): string[] {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value
        .map((v) => (typeof v === 'string' ? v : v != null ? String(v) : null))
        .filter((v): v is string => !!v);
    }
    return [];
  }
}
