import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmType } from '@crm/shared';
import type { Lane } from '@crm/sync-scheduler';
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

  // `lane` defaults to 'slow' = full reconcile (the long-standing behavior used by the manual
  // owner sync endpoints). 'fast' narrows scope to imminent bookings for the 2-min poller.
  async rebaseFromCrm(salonId: string, lane: Lane = 'slow'): Promise<BookingDto[]> {
    const provider = await this.crm.resolveSalonProvider(salonId);

    if (provider === CrmType.ALTEGIO) {
      return this.rebaseAltegioFromList(salonId, lane);
    }

    if (provider === CrmType.EASYWEEK) {
      return this.rebaseEasyweekFromIds(salonId, lane);
    }

    return [];
  }

  // EasyWeek has no list-by-range endpoint, so we pull each known booking by id (~1 req/s each).
  // Fast lane bounds that cost: only active bookings inside the next horizon window, soonest-first,
  // capped — so an unbounded book of business can't overrun the 2-min tick. Slow lane pulls all.
  private async rebaseEasyweekFromIds(salonId: string, lane: Lane): Promise<BookingDto[]> {
    const provider = CrmType.EASYWEEK;
    let bookingIds: string[];

    if (lane === 'fast') {
      const horizonHours = Number.parseInt(process.env.BOOKINGS_FASTLANE_EASYWEEK_HORIZON_HOURS ?? '') || 48;
      const cap = Number.parseInt(process.env.BOOKINGS_FASTLANE_EASYWEEK_MAX ?? '') || 90;
      const now = new Date();
      const until = new Date(now.getTime() + horizonHours * 60 * 60 * 1000);
      const where = {
        salonId,
        crmType: provider,
        crmRecordId: { not: null },
        status: { notIn: ['deleted', 'canceled'] },
        datetime: { gte: now, lte: until },
      };
      const [eligible, rows] = await Promise.all([
        this.prisma.booking.count({ where }),
        this.prisma.booking.findMany({
          where,
          select: { crmRecordId: true },
          orderBy: { datetime: 'asc' }, // soonest first → the cap drops the furthest, never the imminent
          take: cap,
        }),
      ]);
      bookingIds = rows.map((row) => row.crmRecordId as string).filter((id): id is string => Boolean(id));
      if (eligible > cap) {
        // Overload signal: the in-horizon set can't be fully pulled within the fast budget (~1s/booking).
        this.log.warn('EasyWeek fast-lane capacity exceeded', {
          salonId,
          eligible,
          cap,
          horizonHours,
          estFullDurationSec: eligible,
        });
      }
    } else {
      const rows = await this.prisma.booking.findMany({
        where: { salonId, crmType: provider, crmRecordId: { not: null } },
        select: { crmRecordId: true },
      });
      bookingIds = rows.map((row) => row.crmRecordId as string).filter((id): id is string => Boolean(id));
    }

    if (bookingIds.length === 0) return [];

    const bookingsPage = await this.crm.pullEasyweekBookings(salonId, bookingIds);
    const bookings = this.prepareEasyweekPayload(bookingsPage?.items ?? []);
    const results = await Promise.all(
      bookings.map((booking) => this.bookingHandler.handleEasyweekBooking({ booking })),
    );
    const ids = results.map((r) => r.booking?.id).filter((id): id is string => !!id);
    return this.bookingQuery.getByIds(ids);
  }

  // Altegio: instead of fetching each known booking by id, pull the salon's records for the
  // window our bookings span in one paginated `records` call (with_deleted so cancellations come
  // back flagged `deleted`), then run only the records we own through the unchanged snapshot
  // upsert (`handleAltegioBooking`). Records we don't own are read and discarded. Our future
  // bookings absent from the list (hard-purged in Altegio) are marked cancelled.
  private async rebaseAltegioFromList(salonId: string, lane: Lane = 'slow'): Promise<BookingDto[]> {
    const LOOKBACK_DAYS = 2;
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = new Date();

    const allOwned = await this.prisma.booking.findMany({
      where: { salonId, crmType: CrmType.ALTEGIO, crmRecordId: { not: null } },
      select: { id: true, crmRecordId: true, datetime: true, status: true },
    });
    if (allOwned.length === 0) return [];

    // Fast lane scopes BOTH the CRM fetch window AND the owned/purge set to [now, now+horizon].
    // Scoping `owned` is critical: the purge below cancels owned bookings absent from the returned
    // list, so a narrowed fetch window must not "see" bookings beyond it — otherwise everything
    // past the horizon would be wrongly deleted. Slow lane keeps the full window + full owned set.
    let owned = allOwned;
    let startDate: string;
    let endDate: string;
    if (lane === 'fast') {
      const horizonDays = Number.parseInt(process.env.BOOKINGS_FASTLANE_ALTEGIO_HORIZON_DAYS ?? '') || 7;
      const windowEnd = new Date(now.getTime() + horizonDays * DAY_MS);
      owned = allOwned.filter((b) => b.datetime >= now && b.datetime <= windowEnd);
      if (owned.length === 0) return [];
      startDate = this.toYmd(now);
      endDate = this.toYmd(new Date(windowEnd.getTime() + DAY_MS)); // +1 day buffer for tz edges
    } else {
      // Window: from a small lookback (catches just-finished visits whose attendance flipped)
      // through our furthest-out booking. Bounds the fetch to what our bookings actually span
      // instead of the salon's whole history.
      const latestMs = allOwned.reduce((max, b) => Math.max(max, b.datetime.getTime()), now.getTime());
      startDate = this.toYmd(new Date(now.getTime() - LOOKBACK_DAYS * DAY_MS));
      endDate = this.toYmd(new Date(latestMs + DAY_MS)); // +1 day buffer for tz edges
    }

    const ownedById = new Map(owned.map((b) => [b.crmRecordId as string, b]));

    const page = await this.crm.listAltegioRecords(salonId, { startDate, endDate, withDeleted: true });
    const records = this.prepareAltegioPayload(page?.items ?? []);

    const returnedIds = new Set<string>();
    const touchedIds: string[] = [];
    for (const record of records) {
      const crmRecordId = record.crmRecordId ? String(record.crmRecordId) : null;
      if (!crmRecordId) continue;
      returnedIds.add(crmRecordId);
      if (!ownedById.has(crmRecordId)) continue; // foreign record — read but never persist
      const res = await this.bookingHandler.handleAltegioBooking({ booking: record });
      if (res.booking?.id) touchedIds.push(res.booking.id);
    }

    // Future bookings of ours not present in the list were hard-deleted in Altegio → cancel.
    // (Normal cancellations come back via with_deleted and are handled above.)
    const purgedFutureIds = owned
      .filter((b) => !returnedIds.has(b.crmRecordId as string))
      .filter((b) => b.datetime >= now)
      .filter((b) => b.status !== 'deleted' && b.status !== 'canceled')
      .map((b) => b.id);
    if (purgedFutureIds.length) {
      this.log.info('Cancelling Altegio bookings missing from CRM list', { salonId, lane, count: purgedFutureIds.length });
      await this.prisma.booking.updateMany({
        where: { id: { in: purgedFutureIds } },
        data: { status: 'deleted', cancelledAt: now },
      });
    }

    return this.bookingQuery.getByIds([...touchedIds, ...purgedFutureIds]);
  }

  private toYmd(d: Date): string {
    return d.toISOString().slice(0, 10);
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
