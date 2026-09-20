import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, SalonClient } from '@prisma/client';
import { BOOKING_CANCELLED_STATUSES } from '../booking/booking-status';
import {
  buildNameKey,
  hasIdentity,
  isE164,
  isPlausibleEmail,
  type ClientIdentity,
} from './client-identity';

/** A transaction client or a bare PrismaClient — the back-fill has no transaction. */
export type LinkerDb = Prisma.TransactionClient | PrismaClient;

const OLDEST_FIRST: Prisma.SalonClientOrderByWithRelationInput[] = [{ firstSeenAt: 'asc' }, { id: 'asc' }];

/**
 * Resolves a booking's identity to a `salon_clients` row and keeps the per-client
 * counters current (BEA-71). Stateless: every method takes the db handle so the
 * handler can pass its transaction and the back-fill a plain client.
 *
 * Matching rule (decision 2026-09-20): an account id or the CRM's own client id match
 * on their own; a phone or an email only match together with the normalised name.
 * Contact details are shared — a family on one phone, the salon's number typed as a
 * placeholder — and a wrong merge is worse than a duplicate row. Rows are never merged
 * or deleted here; merge tooling is out of scope.
 */
@Injectable()
export class SalonClientLinker {
  /**
   * The id of the client this booking belongs to, creating the row when nobody
   * matches, or `null` when the booking carries no usable identity at all.
   */
  async link(db: LinkerDb, identity: ClientIdentity): Promise<string | null> {
    if (!hasIdentity(identity)) return null;

    // The two bookings-sync lanes can process one salon concurrently and there is no
    // unique constraint to stop two transactions creating the same person twice.
    // Serialise linking per salon; the lock is released at commit. Outside a
    // transaction (back-fill) it is acquired and released immediately — harmless.
    // $executeRaw, not $queryRaw: the function returns void, which Prisma cannot
    // deserialize as a result column.
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'salon_client:' + identity.salonId}))`;

    const existing = await this.findMatch(db, identity);
    if (!existing) {
      const created = await db.salonClient.create({
        data: {
          salonId: identity.salonId,
          displayName: identity.name.displayName,
          firstName: identity.name.firstName,
          lastName: identity.name.lastName,
          nameKey: identity.nameKey,
          phone: identity.phone,
          email: identity.email,
          avatarUrl: await this.avatarFor(db, identity.userId),
          userId: identity.userId,
          altegioClientId: identity.altegioClientId,
          easyweekCustomerId: identity.easyweekCustomerId,
          firstSeenAt: identity.bookingDatetime,
        },
        select: { id: true },
      });
      return created.id;
    }

    const data = await this.merge(db, existing, identity);
    if (data) {
      await db.salonClient.update({ where: { id: existing.id }, data });
    }
    return existing.id;
  }

  /**
   * `bookings_count` = non-cancelled linked bookings; `last_visit_at` = latest
   * non-cancelled booking whose end (or start) is in the past — the same rule as the
   * owner list's `completed` bucket. Recomputed rather than incremented, so a relink,
   * a cancellation or a reschedule cannot drift the numbers.
   */
  async recomputeCounters(db: LinkerDb, clientIds: Array<string | null | undefined>, now = new Date()): Promise<void> {
    const unique = Array.from(new Set(clientIds.filter((id): id is string => typeof id === 'string' && id.length > 0)));
    for (const clientId of unique) {
      const active = { clientId, status: { notIn: BOOKING_CANCELLED_STATUSES } };
      const bookingsCount = await db.booking.count({ where: active });
      const lastVisit = await db.booking.findFirst({
        where: {
          ...active,
          OR: [{ endDatetime: { lt: now } }, { endDatetime: null, datetime: { lt: now } }],
        },
        orderBy: { datetime: 'desc' },
        select: { datetime: true },
      });
      // updateMany: a row that vanished between link and recompute must not throw.
      await db.salonClient.updateMany({
        where: { id: clientId },
        data: { bookingsCount, lastVisitAt: lastVisit?.datetime ?? null },
      });
    }
  }

  // ---- matching ---------------------------------------------------------------------

  /** First hit wins; the oldest row wins a tie so later bookings converge on it. */
  private async findMatch(db: LinkerDb, identity: ClientIdentity): Promise<SalonClient | null> {
    const { salonId } = identity;
    for (const where of this.matchClauses(identity)) {
      const hit = await db.salonClient.findFirst({ where: { salonId, ...where }, orderBy: OLDEST_FIRST });
      if (hit) return hit;
    }
    return null;
  }

  /** The lookups to try, strongest evidence first. Unusable keys are skipped, not relaxed. */
  private matchClauses(identity: ClientIdentity): Prisma.SalonClientWhereInput[] {
    const clauses: Prisma.SalonClientWhereInput[] = [];
    if (identity.userId) clauses.push({ userId: identity.userId });
    if (identity.altegioClientId) clauses.push({ altegioClientId: identity.altegioClientId });
    if (identity.easyweekCustomerId) clauses.push({ easyweekCustomerId: identity.easyweekCustomerId });
    if (identity.nameKey) {
      if (isE164(identity.phone)) clauses.push({ phone: identity.phone, nameKey: identity.nameKey });
      if (isPlausibleEmail(identity.email)) clauses.push({ email: identity.email, nameKey: identity.nameKey });
    }
    return clauses;
  }

  // ---- merging ----------------------------------------------------------------------

  /**
   * What to write onto a matched row, or `null` when nothing would change.
   *
   * Identifiers are fill-only: a row learns its account id / CRM id once and keeps it,
   * so two CRM cards for one person do not make the id flap between syncs. Profile
   * fields are last-write-wins with a null guard, so a CRM-side edit propagates but a
   * booking lacking a field never blanks it. The name key follows the merged name.
   */
  private async merge(db: LinkerDb, existing: SalonClient, identity: ClientIdentity): Promise<Prisma.SalonClientUpdateInput | null> {
    const userId = existing.userId ?? identity.userId;
    const firstName = identity.name.firstName ?? existing.firstName;
    const lastName = identity.name.lastName ?? existing.lastName;
    const displayName = identity.name.displayName ?? existing.displayName;
    const next = {
      userId,
      altegioClientId: existing.altegioClientId ?? identity.altegioClientId,
      easyweekCustomerId: existing.easyweekCustomerId ?? identity.easyweekCustomerId,
      firstName,
      lastName,
      displayName,
      nameKey: buildNameKey({ firstName, lastName, displayName }),
      // A good number is never replaced by the CRM's free-text fallback.
      phone: identity.phone && (isE164(identity.phone) || !existing.phone) ? identity.phone : existing.phone,
      email: identity.email ?? existing.email,
      avatarUrl: existing.avatarUrl,
      firstSeenAt:
        identity.bookingDatetime < existing.firstSeenAt ? identity.bookingDatetime : existing.firstSeenAt,
    };
    if (!next.avatarUrl && userId) {
      next.avatarUrl = await this.avatarFor(db, userId);
    }

    const changed = (Object.keys(next) as Array<keyof typeof next>).filter((key) => {
      const a = next[key];
      const b = existing[key];
      return a instanceof Date || b instanceof Date ? (a as Date)?.getTime() !== (b as Date)?.getTime() : a !== b;
    });
    if (changed.length === 0) return null;

    const data: Prisma.SalonClientUpdateInput = {};
    for (const key of changed) (data as any)[key] = next[key];
    return data;
  }

  /** The CRMs carry no avatar; only a Beautyn account can supply one. */
  private async avatarFor(db: LinkerDb, userId: string | null): Promise<string | null> {
    if (!userId) return null;
    const user = await db.users.findUnique({ where: { id: userId }, select: { avatarUrl: true } });
    return user?.avatarUrl ?? null;
  }
}
