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
      nextCursor,
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
      nextCursor,
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
      salonId: booking.salonId,
      userId: booking.userId ?? null,
      worker: booking.worker
        ? {
            id: booking.worker.id,
            firstName: booking.worker.firstName,
            lastName: booking.worker.lastName,
            photoUrl: booking.worker.photoUrl,
          }
        : null,
      status: booking.status,
      datetime: booking.datetime.toISOString(),
      endDatetime: booking.endDatetime ? booking.endDatetime.toISOString() : null,
      comment: booking.comment ?? null,
      crmType: booking.crmType ?? null,
      crmRecordId: booking.crmRecordId ?? null,
      crmCompanyId: booking.crmCompanyId ?? null,
      crmStaffId: booking.crmStaffId ?? null,
      crmServiceIds: this.toStringArray(booking.crmServiceIds),
      serviceIds: this.toStringArray(booking.serviceIds),
      shortLink: booking.shortLink ?? null,
      createdAt: booking.createdAt.toISOString(),
      updatedAt: booking.updatedAt.toISOString(),
      providerSpecific: {
        easyweek: this.mapEasyweek(booking),
        altegio: this.mapAltegio(booking),
      },
      history: includeHistory
        ? Array.isArray(booking.history)
          ? booking.history.map((h) => ({
              version: h.version,
              syncedAt: h.syncedAt.toISOString(),
              remoteUpdatedAt: h.remoteUpdatedAt ?? null,
              payload: h.payload ?? null,
              diffFromPrev: h.diffFromPrev ?? null,
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
      bookingUuid: booking.crmRecordId ?? null,
      locationUuid: booking.crmCompanyId ?? null,
      timezone,
      statusName: statusName ?? null,
      isCanceled: isCanceled ?? undefined,
      isCompleted: isCompleted ?? undefined,
      links: (details.links || []).map((l) => ({ type: l.type, url: l.url })),
      duration: details.duration
        ? {
            value: details.duration.value,
            label: details.duration.label,
            iso8601: details.duration.iso8601,
          }
        : undefined,
      orderedServices: (details.orderedServices || []).map((svc: any) => ({
        externalUuid: svc.externalUuid ?? null,
        reservedOn: svc.reservedOn ? svc.reservedOn.toISOString() : null,
        reservedUntil: svc.reservedUntil ? svc.reservedUntil.toISOString() : null,
        timezone: svc.timezone ?? null,
        quantity: svc.quantity ?? null,
        name: svc.name ?? null,
        description: svc.description ?? null,
        currency: svc.currency ?? null,
        price: svc.price ?? null,
        priceFormatted: svc.priceFormatted ?? null,
        discount: svc.discount ?? null,
        discountFormatted: svc.discountFormatted ?? null,
        originalPrice: svc.originalPrice ?? null,
        originalPriceFormatted: svc.originalPriceFormatted ?? null,
        durationValue: svc.durationValue ?? null,
        durationLabel: svc.durationLabel ?? null,
        durationIso: svc.durationIso ?? null,
        originalDurationValue: svc.originalDurationValue ?? null,
        originalDurationLabel: svc.originalDurationLabel ?? null,
        originalDurationIso: svc.originalDurationIso ?? null,
      })),
      order: details.order
        ? {
            tax: details.order.tax ?? undefined,
            subtotal: details.order.subtotal ?? null,
            subtotalFormatted: details.order.subtotalFormatted ?? null,
            amountPaid: details.order.amountPaid ?? null,
            amountPaidFormatted: details.order.amountPaidFormatted ?? null,
            total: details.order.total ?? null,
            totalFormatted: details.order.totalFormatted ?? null,
          }
        : undefined,
    };
  }

  private mapAltegio(booking: BookingWithRelations): BookingProviderAltegioDto | undefined {
    const details = booking.altegioDetails as any;
    if (!details) return undefined;
    return {
      crmRecordId: details.crmRecordId ?? booking.crmRecordId ?? null,
      companyId: details.companyId ?? null,
      staffId: details.staffId ?? null,
      clientId: details.clientId ?? null,
      datetime: details.datetime ? new Date(details.datetime).toISOString() : null,
      date: details.date ? new Date(details.date).toISOString() : null,
      comment: details.comment ?? null,
      attendance: details.attendance ?? null,
      confirmed: details.confirmed ?? null,
      visitAttendance: details.visitAttendance ?? null,
      length: details.length ?? null,
      seanceLength: details.seanceLength ?? null,
      isDeleted: details.deleted ?? null,
      staff: details.staff
        ? {
            externalId: details.staff.externalId ?? null,
            apiId: details.staff.apiId ?? null,
            name: details.staff.name ?? null,
            specialization: details.staff.specialization ?? null,
            avatar: details.staff.avatar ?? null,
            avatarBig: details.staff.avatarBig ?? null,
            rating: details.staff.rating ?? null,
            votesCount: details.staff.votesCount ?? null,
          }
        : null,
      client: details.client
        ? {
            externalId: details.client.externalId ?? null,
            displayName: details.client.displayName ?? null,
            phone: details.client.phone ?? null,
            email: details.client.email ?? null,
            discount: details.client.discount ?? null,
          }
        : null,
      services: Array.isArray(details.services)
        ? details.services.map((svc: any) => ({
            externalId: svc.externalId ?? null,
            title: svc.title ?? null,
            cost: svc.cost ?? null,
            costToPay: svc.costToPay ?? null,
            discount: svc.discount ?? null,
          }))
        : undefined,
      documents: Array.isArray(details.documents)
        ? details.documents.map((doc: any) => ({
            externalId: doc.externalId ?? null,
            typeId: doc.typeId ?? null,
            storageId: doc.storageId ?? null,
            userId: doc.userId ?? null,
            companyId: doc.companyId ?? null,
            number: doc.number ?? null,
            comment: doc.comment ?? null,
            dateCreated: doc.dateCreated ? new Date(doc.dateCreated).toISOString() : null,
          }))
        : undefined,
      goodsTransactions: Array.isArray(details.goodsTransactions)
        ? details.goodsTransactions.map((tx: any) => ({
            externalId: tx.externalId ?? null,
            typeId: tx.typeId ?? null,
            storageId: tx.storageId ?? null,
            userId: tx.userId ?? null,
            companyId: tx.companyId ?? null,
            number: tx.number ?? null,
            comment: tx.comment ?? null,
            dateCreated: tx.dateCreated ? new Date(tx.dateCreated).toISOString() : null,
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
