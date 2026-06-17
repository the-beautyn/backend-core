import { Injectable } from '@nestjs/common';
import { Prisma, Booking } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { BookingDto, BookingListResponseDto, BookingProviderAltegioDto, BookingProviderEasyweekDto } from './dto/booking.response.dto';

type BookingWithRelations = Booking & {
  salon: {
    id: string;
    name: string | null;
    addressLine: string | null;
    latitude: Prisma.Decimal | null;
    longitude: Prisma.Decimal | null;
    coverImageUrl: string | null;
    timezone: string | null;
  } | null;
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
    salon: {
      select: {
        id: true,
        name: true,
        addressLine: true,
        latitude: true,
        longitude: true,
        coverImageUrl: true,
        timezone: true,
      },
    },
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

  // EasyWeek cancels to 'canceled'; Altegio soft-deletes to 'deleted'. Both belong in the
  // Cancelled tab and must be excluded from upcoming/past.
  private static readonly CANCELLED_STATUSES = ['canceled', 'deleted'];

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
    sort?: 'datetime_asc' | 'datetime_desc';
  }): Promise<BookingListResponseDto> {
    const take = this.clampTake(params.limit);
    const direction: Prisma.SortOrder = params.sort === 'datetime_asc' ? 'asc' : 'desc';
    const where = this.buildClientScopeWhere(params, new Date());

    // All buckets (incl. cancelled) are returned ordered by appointment datetime.
    // The Cancelled tab is re-ordered by cancelledAt client-side; cancelled_at is
    // still exposed in the DTO so the app has the value to sort by.
    const items = await this.prisma.booking.findMany({
      where,
      include: this.include,
      take: take + 1,
      skip: params.cursor ? 1 : 0,
      cursor: params.cursor ? { id: params.cursor } : undefined,
      orderBy: [{ datetime: direction }, { id: direction }],
    });

    const nextCursor = items.length > take ? items[take].id : undefined;
    const slice = items.slice(0, take) as unknown as BookingWithRelations[];
    return {
      items: slice.map((b) => this.mapBooking(b, { includeHistory: false })),
      next_cursor: nextCursor,
      limit: take,
    };
  }

  // The My Bookings tabs send `status` as a bucket selector (created → upcoming,
  // completed → past, canceled → cancelled). We translate that into a datetime-driven
  // WHERE evaluated at read-time, so a booking is never stranded just because the CRM
  // never flipped its stored status:
  //   • upcoming  → not cancelled AND the visit hasn't happened (end, fallback start, is in
  //                 the future) AND not already marked attended (Altegio attendance=1).
  //   • past      → not cancelled AND (end/start has passed OR Altegio attendance=1).
  //   • cancelled → EasyWeek 'canceled' + Altegio 'deleted'.
  // Any other/absent status falls back to the legacy generic status + date-range filter.
  private buildClientScopeWhere(
    params: { userId: string; status?: string; from?: Date; to?: Date },
    now: Date,
  ): Prisma.BookingWhereInput {
    const base: Prisma.BookingWhereInput = { userId: params.userId };
    const notCancelled = { notIn: BookingQueryService.CANCELLED_STATUSES };
    const attended: Prisma.BookingWhereInput = { altegioDetails: { is: { attendance: 1 } } };
    // "Not attended" must be NULL-safe: `NOT: { altegioDetails: { is: { attendance: 1 } } }`
    // compiles to `NOT (attendance = 1 AND booking_id IS NOT NULL)`, which evaluates to NULL
    // (→ row dropped) when attendance IS NULL — the state app-created Altegio bookings sit in
    // until a CRM sync sets attendance = 0. Spell out the NULL/no-details cases explicitly so a
    // freshly booked appointment shows in Upcoming immediately, before any reconcile.
    const notAttended: Prisma.BookingWhereInput = {
      OR: [
        { altegioDetails: { is: null } },                       // EasyWeek / no Altegio details row
        { altegioDetails: { is: { attendance: null } } },       // Altegio, not yet synced
        { altegioDetails: { is: { attendance: { not: 1 } } } }, // Altegio, attendance ≠ 1
      ],
    };
    const endInPast: Prisma.BookingWhereInput[] = [
      { endDatetime: { lt: now } },
      { AND: [{ endDatetime: null }, { datetime: { lt: now } }] },
    ];
    const endInFuture: Prisma.BookingWhereInput[] = [
      { endDatetime: { gte: now } },
      { AND: [{ endDatetime: null }, { datetime: { gte: now } }] },
    ];

    switch (params.status) {
      case 'created':
        return {
          ...base,
          status: notCancelled,
          AND: [{ OR: endInFuture }, notAttended],
        };
      case 'completed':
        return {
          ...base,
          status: notCancelled,
          OR: [...endInPast, attended],
        };
      case 'canceled':
        return { ...base, status: { in: BookingQueryService.CANCELLED_STATUSES } };
      default:
        return {
          ...base,
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
    }
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
    const easyweek = this.mapEasyweek(booking);
    const altegio = this.mapAltegio(booking);
    return {
      id: booking.id,
      salon_id: booking.salonId,
      salon: booking.salon
        ? {
            id: booking.salon.id,
            name: booking.salon.name ?? null,
            address_line: booking.salon.addressLine ?? null,
            latitude: booking.salon.latitude != null ? Number(booking.salon.latitude) : null,
            longitude: booking.salon.longitude != null ? Number(booking.salon.longitude) : null,
            cover_image_url: booking.salon.coverImageUrl ?? null,
            timezone: booking.salon.timezone ?? null,
          }
        : null,
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
      service_names: this.computeServiceNames(easyweek, altegio),
      total_price: this.computeTotalPrice(easyweek, altegio),
      currency: this.computeCurrency(easyweek),
      duration_minutes: this.computeDurationMinutes(booking, easyweek, altegio),
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
      cancelled_at: booking.cancelledAt ? booking.cancelledAt.toISOString() : null,
      provider_specific: {
        easyweek,
        altegio,
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

  private computeServiceNames(
    ew?: BookingProviderEasyweekDto,
    al?: BookingProviderAltegioDto,
  ): string[] {
    const ewNames = (ew?.ordered_services ?? []).map((s) => s.name).filter((n): n is string => !!n);
    if (ewNames.length) return ewNames;
    return (al?.services ?? []).map((s) => s.title).filter((t): t is string => !!t);
  }

  private computeTotalPrice(
    ew?: BookingProviderEasyweekDto,
    al?: BookingProviderAltegioDto,
  ): number | null {
    if (ew) {
      if (ew.order?.total != null) return ew.order.total;
      const sum = (ew.ordered_services ?? []).reduce(
        (acc, s) => acc + (s.price ?? 0) * (s.quantity ?? 1),
        0,
      );
      if (sum > 0) return sum;
    }
    const alSum = (al?.services ?? []).reduce((acc, s) => acc + (s.cost_to_pay ?? s.cost ?? 0), 0);
    return alSum > 0 ? alSum : null;
  }

  private computeCurrency(ew?: BookingProviderEasyweekDto): string | null {
    return (ew?.ordered_services ?? []).find((s) => !!s.currency)?.currency ?? null;
  }

  // The booking window (end - start) is the most reliable duration source, so we
  // prefer it. Provider duration fields are stored in seconds and used as fallback.
  private computeDurationMinutes(
    booking: BookingWithRelations,
    ew?: BookingProviderEasyweekDto,
    al?: BookingProviderAltegioDto,
  ): number | null {
    if (booking.endDatetime && booking.datetime) {
      const diffMs = booking.endDatetime.getTime() - booking.datetime.getTime();
      if (diffMs > 0) return Math.round(diffMs / 60000);
    }
    if (ew?.duration) {
      const fromIso = this.iso8601ToMinutes(ew.duration.iso8601 ?? null);
      if (fromIso != null) return fromIso;
      if (ew.duration.value != null) return this.secondsToMinutes(ew.duration.value);
    }
    const ewServicesSum = (ew?.ordered_services ?? []).reduce(
      (acc, s) => acc + (s.duration_value ?? 0),
      0,
    );
    if (ewServicesSum > 0) return this.secondsToMinutes(ewServicesSum);
    const alLength = al?.seance_length ?? al?.length ?? null;
    if (alLength != null && alLength > 0) return this.secondsToMinutes(alLength);
    return null;
  }

  private secondsToMinutes(seconds: number): number {
    return Math.round(seconds / 60);
  }

  private iso8601ToMinutes(iso: string | null): number | null {
    if (!iso) return null;
    const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso);
    if (!match) return null;
    const [, d, h, m, s] = match;
    const total =
      (d ? Number(d) : 0) * 1440 +
      (h ? Number(h) : 0) * 60 +
      (m ? Number(m) : 0) +
      Math.round((s ? Number(s) : 0) / 60);
    return total > 0 ? total : null;
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
