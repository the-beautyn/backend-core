import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CrmType } from '@crm/shared';
import type { EasyWeekBooking } from '@crm/provider-core/easyweek/bookings';
import type { AltegioBooking } from '@crm/provider-core/altegio/bookings';
import type {
  EasyweekBookingCustomerDto,
  EasyweekBookingDtoNormalized,
} from '../crm-integration/core/dto/easyweek-booking.dto';
import { PrismaService } from '../shared/database/prisma.service';
import { SalonClientLinker } from '../salon-clients/salon-client-linker.service';
import { identityFromSources, type ClientIdentity } from '../salon-clients/client-identity';
import { BOOKING_CANCELLED_STATUSES } from './booking-status';
import {
  clientFromAltegioClient,
  clientFromEasyweekCustomer,
  clientFromRow,
  EMPTY_CLIENT,
  hasAnyClientField,
  resolveClientSnapshot as resolveSnapshot,
  type ClientSnapshot,
} from './client-snapshot';

/** The account columns the snapshot fallback and the client identity both read. */
type AccountRow = { name: string | null; secondName: string | null; phone: string | null; email: string | null };

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
  customer?: EasyweekBookingCustomerDto | null;
  raw?: any;
};

@Injectable()
export class BookingHandlerService {
  // Shared with BookingQueryService and the salon-client counters — see booking-status.ts.
  private static readonly CANCELLED_STATUSES = BOOKING_CANCELLED_STATUSES;

  constructor(
    private readonly prisma: PrismaService,
    private readonly clients: SalonClientLinker,
  ) {}

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
    const { snapshot: client, account } = await this.resolveClientSnapshot(
      clientFromEasyweekCustomer(normalized.customer ?? null),
      params.userId ?? null,
    );
    const identity = identityFromSources({
      salonId: params.salonId,
      userId: params.userId ?? null,
      snapshot: client,
      easyweekCustomer: normalized.customer ?? null,
      account,
      bookingDatetime: start,
    });

    const incoming = await this.buildEasyweekIncomingState({
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
      client,
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const { clientId } = await this.clients.assign(tx, { bookingId: null, identity, mode: 'write' });
      const booking = await tx.booking.create({
        data: {
          salonId: params.salonId,
          userId: params.userId ?? null,
          clientId,
          status,
          cancelledAt: this.resolveCancelledAt(null, null, status),
          datetime: start,
          endDatetime: end ?? null,
          crmType: CrmType.EASYWEEK,
          crmRecordId: normalized.bookingUuid,
          crmCompanyId: normalized.locationUuid ?? null,
          crmStaffId: incoming.crmStaffId,
          workerId: incoming.workerId,
          comment: normalized.comment ?? null,
          crmPayload: payload,
          ...client,
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

      await this.clients.recomputeCounters(tx, [clientId]);
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
    const { snapshot: client, account } = await this.resolveClientSnapshot(
      clientFromEasyweekCustomer(normalized.customer ?? null),
      existing.userId ?? null,
    );
    const identity = identityFromSources({
      salonId: existing.salonId,
      userId: existing.userId ?? null,
      snapshot: client,
      easyweekCustomer: normalized.customer ?? null,
      account,
      bookingDatetime: start,
    });

    const incoming = await this.buildEasyweekIncomingState({
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
      client,
    });

    const existingSnapshot = this.buildEasyweekExistingState(existing);
    if (this.isEqual(existingSnapshot.snapshot, incoming.snapshot)) {
      await this.reconcileClientOnUnchanged(existing, identity);
      return { booking: existing, changed: false };
    }

    const nextVersion = (existing.version ?? 0) + 1;
    await this.prisma.$transaction(async (tx) => {
      const { clientId, previousClientId } = await this.clients.assign(tx, { bookingId: existing.id, identity, mode: 'write' });
      await tx.booking.update({
        where: { id: existing.id },
        data: {
          userId: existing.userId ?? null,
          clientId,
          status,
          cancelledAt: this.resolveCancelledAt(existing.status, existing.cancelledAt, status),
          datetime: start,
          endDatetime: end ?? null,
          crmCompanyId: normalized.locationUuid ?? null,
          crmStaffId: incoming.crmStaffId,
          workerId: incoming.workerId,
          comment: normalized.comment ?? null,
          crmPayload: payload,
          ...client,
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

      await this.clients.recomputeCounters(tx, [clientId, previousClientId]);
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

    const identity = this.altegioIdentity(params.salonId, params.userId ?? null, incoming, start);
    const created = await this.prisma.$transaction(async (tx) => {
      const { clientId } = await this.clients.assign(tx, { bookingId: null, identity, mode: 'write' });
      const booking = await tx.booking.create({
        data: {
          salonId: params.salonId,
          userId: params.userId ?? null,
          clientId,
          status,
          cancelledAt: this.resolveCancelledAt(null, null, status),
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
          ...incoming.clientSnapshot,
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

      await this.clients.recomputeCounters(tx, [clientId]);
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

    const identity = this.altegioIdentity(existing.salonId, existing.userId ?? null, incoming, start);
    const existingSnapshot = this.buildAltegioExistingState(existing);
    if (this.isEqual(existingSnapshot.snapshot, incoming.snapshot)) {
      await this.reconcileClientOnUnchanged(existing, identity);
      return { booking: existing, changed: false };
    }

    const nextVersion = (existing.version ?? 0) + 1;
    await this.prisma.$transaction(async (tx) => {
      const { clientId, previousClientId } = await this.clients.assign(tx, { bookingId: existing.id, identity, mode: 'write' });
      await tx.booking.update({
        where: { id: existing.id },
        data: {
          userId: existing.userId ?? null,
          clientId,
          status,
          cancelledAt: this.resolveCancelledAt(existing.status, existing.cancelledAt, status),
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
          ...incoming.clientSnapshot,
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

      await this.clients.recomputeCounters(tx, [clientId, previousClientId]);
    });

    return { booking: existing, changed: true };
  }

  /**
   * The client to store on the booking row. The precedence rules live in
   * `client-snapshot.ts` so the back-fill script produces byte-identical results;
   * all this adds is the account read, since `Booking.userId` is a bare column with
   * no Prisma relation to follow. The account is handed back as well: the salon-client
   * identity needs its structured name, and one read is enough.
   */
  private async resolveClientSnapshot(
    fromCrm: ClientSnapshot,
    userId: string | null | undefined,
  ): Promise<{ snapshot: ClientSnapshot; account: AccountRow | null }> {
    if (hasAnyClientField(fromCrm)) return { snapshot: fromCrm, account: null };
    if (!userId) return { snapshot: EMPTY_CLIENT, account: null };

    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      select: { name: true, secondName: true, phone: true, email: true },
    });
    return { snapshot: resolveSnapshot(fromCrm, user), account: user };
  }

  private altegioIdentity(
    salonId: string,
    userId: string | null,
    incoming: { clientSnapshot: ClientSnapshot; client: any; account: AccountRow | null },
    bookingDatetime: Date,
  ): ClientIdentity {
    return identityFromSources({
      salonId,
      userId,
      snapshot: incoming.clientSnapshot,
      altegioClient: incoming.client,
      account: incoming.account,
      bookingDatetime,
    });
  }

  /**
   * The sync re-reads every booking and returns early when nothing changed; two
   * client-side facts still need that pass. Rows written before BEA-71 have no client
   * yet — attach it, without a booking version, since nothing about the booking itself
   * changed (rows synced after deploy are right ahead of the back-fill). And a linked
   * booking that has since become a past visit may not be reflected in the client's
   * `last_visit_at`, which no write would otherwise refresh.
   */
  private async reconcileClientOnUnchanged(
    existing: {
      id: string;
      salonId: string;
      clientId: string | null;
      status: string;
      datetime: Date;
      endDatetime: Date | null;
      altegioDetails?: { attendance: number | null } | null;
    },
    identity: ClientIdentity,
  ): Promise<void> {
    if (existing.clientId) {
      const visit = { ...existing, attended: existing.altegioDetails?.attendance === 1 };
      // One unlocked read decides whether a locked transaction is worth opening.
      if (await this.clients.isLastVisitStale(this.prisma, visit)) {
        await this.prisma.$transaction(async (tx) => {
          await this.clients.lockSalon(tx, existing.salonId);
          await this.clients.refreshLastVisitIfStale(tx, visit);
        });
      }
      return;
    }
    await this.prisma.$transaction(async (tx) => {
      // `attach`: fill a missing link only; a link the other lane wrote meanwhile stays.
      const { clientId, previousClientId } = await this.clients.assign(tx, { bookingId: existing.id, identity, mode: 'attach' });
      if (!clientId || clientId === previousClientId) return;
      await tx.booking.update({ where: { id: existing.id }, data: { clientId } });
      await this.clients.recomputeCounters(tx, [clientId]);
    });
  }

  /**
   * EasyWeek's `customer` as it sits in the untouched payload. Used when the typed
   * field is absent — the raw blob has carried it all along, which is also what
   * lets the migration back-fill historical rows without a CRM re-pull.
   */
  private readRawCustomer(raw: any): EasyweekBookingCustomerDto | null {
    const customer = raw?.customer;
    if (!customer || typeof customer !== 'object') return null;
    return {
      uuid: customer.uuid ?? null,
      firstName: customer.first_name ?? customer.firstName ?? null,
      lastName: customer.last_name ?? customer.lastName ?? null,
      middleName: customer.middle_name ?? customer.middleName ?? null,
      phone: customer.phone ?? null,
      email: customer.email ?? null,
    };
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
        // Fall back to the raw payload: callers built before the customer was
        // threaded through still carry it there, untouched.
        customer: dto.customer ?? this.readRawCustomer(dto.raw),
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
      customer: booking.customer ?? this.readRawCustomer(booking.raw),
      raw: booking.raw ?? null,
    };
  }

  private async buildEasyweekIncomingState(args: {
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
    client: ClientSnapshot;
  }) {
    const mappedDuration = this.mapEasyweekDuration(args.duration);
    const mappedOrder = this.mapEasyweekOrder(args.order);
    const mappedLinks = this.mapEasyweekLinks(args.links);
    const mappedServices = this.mapEasyweekOrderedServices(args.orderedServices);
    // EasyWeek names the master per ordered service (`staffer.uuid`), and that
    // uuid is what the workers sync stores as Worker.crmWorkerId. One booking
    // can in principle span services with different staffers; the first one
    // stands for the booking, which is also how the panel shows it.
    const crmStaffId = this.extractEasyweekStafferUuid(args.orderedServices);
    const workerId = crmStaffId ? await this.resolveWorkerId(args.salonId, crmStaffId) : null;

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
        crmStaffId,
        // In the snapshot so a booking that only gained a resolvable worker
        // (e.g. after the workers sync caught up) is detected as changed.
        workerId,
        crmServiceIds: null,
        serviceIds: null,
        shortLink: args.shortLink ?? null,
        crmPayload: args.crmPayload ?? null,
        // In the snapshot deliberately: without it, a booking whose only change
        // is the client compares equal and the CRM-side edit is dropped by the
        // early return in the update path.
        ...args.client,
      },
    });

    return {
      snapshot,
      crmStaffId,
      workerId,
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
        workerId: existing.workerId ?? null,
        crmServiceIds: this.normalizeJsonArray(existing.crmServiceIds),
        serviceIds: this.normalizeJsonArray(existing.serviceIds),
        shortLink: existing.shortLink ?? null,
        crmPayload: existing.crmPayload ?? null,
        ...clientFromRow(existing),
      },
    });

    return { snapshot };
  }

  private extractEasyweekStafferUuid(orderedServices: any[]): string | null {
    for (const svc of Array.isArray(orderedServices) ? orderedServices : []) {
      const uuid = svc?.staffer?.uuid ?? svc?.staffer_uuid ?? svc?.stafferUuid ?? null;
      if (uuid) return String(uuid);
    }
    return null;
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
    const workerId = staffId ? await this.resolveWorkerId(args.salonId, staffId) : null;
    const serviceIds = serviceExternalIds.length ? await this.resolveServiceIds(CrmType.ALTEGIO, serviceExternalIds) : [];

    const mappedDetails = this.mapAltegioDetails(args.booking?.raw ?? args.booking ?? null);
    const mappedStaff = this.mapAltegioStaff(args.booking?.staff ?? args.booking?.raw?.staff ?? null);
    const mappedClient = this.mapAltegioClient(args.booking?.client ?? args.booking?.raw?.client ?? null);
    const mappedServices = this.mapAltegioServices(args.booking?.services ?? args.booking?.raw?.services ?? null);
    const mappedDocuments = this.mapAltegioDocuments(args.booking?.documents ?? args.booking?.raw?.documents ?? null);
    const mappedGoods = this.mapAltegioGoods(args.booking?.goodsTransactions ?? args.booking?.raw?.goods_transactions ?? null);
    // `mapAltegioClient` returns an all-nulls object rather than null when Altegio
    // sent no client, so the fallback is driven by content, not by presence.
    const { snapshot: clientSnapshot, account } = await this.resolveClientSnapshot(
      clientFromAltegioClient(mappedClient),
      args.userId,
    );

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
        // See the EasyWeek builder: in the snapshot so a client-only CRM edit is
        // not swallowed by the change-detection guard.
        ...clientSnapshot,
      },
    });

    return {
      snapshot,
      clientSnapshot,
      account,
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
        ...clientFromRow(existing),
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
      // Monetary fields → cents (see toCents). `discount` is a percentage and
      // `amount` is a quantity, so both stay as-is.
      cost: this.toCents(s?.cost),
      costToPay: this.toCents(s?.cost_to_pay ?? s?.costToPay),
      manualCost: this.toCents(s?.manual_cost ?? s?.manualCost),
      costPerUnit: this.toCents(s?.cost_per_unit ?? s?.costPerUnit),
      discount: this.toNumber(s?.discount),
      firstCost: this.toCents(s?.first_cost ?? s?.firstCost),
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

  // The CRM's staff id is the worker's `crmWorkerId` in the same salon — the
  // workers sync writes it there. (A `WorkerMapping` table exists in the schema
  // but nothing has ever written to it, so resolving through it left every
  // synced booking without a worker and the owner panel's Майстер column empty.)
  // Scoped to the salon because staff ids are only unique per CRM company.
  private async resolveWorkerId(salonId: string, crmStaffId: string): Promise<string | null> {
    const worker = await this.prisma.worker.findFirst({
      where: { salonId, crmWorkerId: crmStaffId },
      select: { id: true },
    });
    return worker?.id ?? null;
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

  // Stamp the moment a booking transitions into a cancelled state, so the Cancelled
  // tab can be ordered by when it was cancelled (not the appointment date). Preserve
  // the original stamp across later re-syncs of an already-cancelled booking, clear it
  // if the booking is reactivated, and backfill legacy rows that predate the field.
  private resolveCancelledAt(prevStatus: string | null, prevCancelledAt: Date | null, nextStatus: string): Date | null {
    if (!BookingHandlerService.CANCELLED_STATUSES.includes(nextStatus)) return null;
    const wasCancelled = prevStatus != null && BookingHandlerService.CANCELLED_STATUSES.includes(prevStatus);
    if (wasCancelled) return prevCancelledAt ?? new Date();
    return new Date();
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

  // Altegio returns monetary values in major currency units (e.g. ₴700), but the
  // canonical internal unit is cents — the services sync converts Altegio prices
  // with `* 100` (services.service.ts). Convert booking costs the same way so a
  // synced booking matches app-created bookings and `total_price` stays in cents.
  private toCents(value: any): number | null {
    const num = this.toNumber(value);
    return num === null ? null : Math.round(num * 100);
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
