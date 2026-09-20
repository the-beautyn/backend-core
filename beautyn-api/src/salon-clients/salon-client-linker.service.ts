import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient, SalonClient } from '@prisma/client';
import { BOOKING_CANCELLED_STATUSES } from '../booking/booking-status';
import {
  hasIdentity,
  nameKeyFor,
  isE164,
  isPlausibleEmail,
  type ClientIdentity,
} from './client-identity';

/** A transaction client or a bare PrismaClient — the back-fill has no transaction. */
export type LinkerDb = Prisma.TransactionClient | PrismaClient;

const OLDEST_FIRST: Prisma.SalonClientOrderByWithRelationInput[] = [{ firstSeenAt: 'asc' }, { id: 'asc' }];

/** Clients recomputed per locked transaction by `recomputeCountersLocked`. */
export const COUNTER_CHUNK = 200;

/**
 * How `assign` treats a booking that already has a client.
 *  - `write`:  the booking changed; the identity decides, so the link may move.
 *  - `attach`: nothing about the booking changed; only fill a missing link, never move one.
 */
export type AssignMode = 'write' | 'attach';

export type Assignment = {
  /** The client the booking belongs to now (null when it has no usable identity). */
  clientId: string | null;
  /** The client it belonged to before this decision (null when it had none). */
  previousClientId: string | null;
};

/**
 * Resolves a booking's identity to a `salon_clients` row and keeps the per-client
 * counters current (BEA-71). Stateless: every method takes the db handle.
 *
 * Matching rule (decision 2026-09-20): an account id or the CRM's own client id match
 * on their own; a phone or an email only match together with the normalised name.
 * Contact details are shared — a family on one phone, the salon's number typed as a
 * placeholder — and a wrong merge is worse than a duplicate row. Rows are never merged
 * or deleted here; merge tooling is out of scope.
 *
 * Two layers keep concurrent syncs from creating one person twice or blanking each
 * other's links, and neither depends on a caller remembering anything:
 *  1. The database: exact identities are unique per salon, so a second row for the same
 *     account / CRM client is refused; `link` re-matches on that conflict.
 *  2. This class: `assign` is the one entry point for deciding a booking's client, and
 *     it does lock → re-read → match → decide in that order, inside the caller's
 *     transaction. Booking write paths call `assign`; nothing else.
 */
@Injectable()
export class SalonClientLinker {
  /**
   * Decide which client a booking belongs to. Must run inside the caller's transaction,
   * which then writes `clientId` on the booking and recomputes both returned clients.
   *
   * `bookingId` is null on create (the row does not exist yet). For an existing booking
   * the current link is re-read under the lock — the row the caller loaded predates the
   * transaction, and the other sync lane may have linked it meanwhile. A payload without
   * any usable identity says nothing about the person, so the current link stays.
   */
  async assign(
    tx: Prisma.TransactionClient,
    args: { bookingId: string | null; identity: ClientIdentity; mode: AssignMode },
  ): Promise<Assignment> {
    await this.lockSalon(tx, args.identity.salonId);
    const current = args.bookingId
      ? ((await tx.booking.findUnique({ where: { id: args.bookingId }, select: { clientId: true } }))?.clientId ?? null)
      : null;
    if (args.mode === 'attach' && current) {
      return { clientId: current, previousClientId: current };
    }
    const linked = await this.link(tx, args.identity);
    return { clientId: linked ?? current, previousClientId: current };
  }

  /**
   * Match-or-create for an identity, or `null` when it has no usable key. The caller is
   * expected to hold the salon lock (`assign` does); the unique indexes make a race
   * survivable anyway: a create that loses the race re-matches, and a fill-only
   * identifier that already belongs to another row is left unset rather than moved.
   */
  async link(db: LinkerDb, identity: ClientIdentity): Promise<string | null> {
    if (!hasIdentity(identity)) return null;

    const existing = await this.findMatch(db, identity);
    if (!existing) {
      try {
        return await this.create(db, identity);
      } catch (err) {
        if (!isUniqueViolation(err)) throw err;
        // Someone created this person between our lookup and our insert.
        const raced = await this.findMatch(db, identity);
        if (!raced) throw err;
        return this.update(db, raced, identity);
      }
    }
    return this.update(db, existing, identity);
  }

  /**
   * Serialise client writes for one salon. Transaction-scoped: released at commit. On a
   * bare client it is released as soon as the statement ends, so bulk paths wrap their
   * work in `$transaction`. Belt to the unique indexes' braces: it also keeps the
   * name+contact matches (which cannot be unique) and the counter recomputes serialised.
   *
   * $executeRaw, not $queryRaw: the function returns void, which Prisma cannot
   * deserialize as a result column.
   */
  async lockSalon(db: LinkerDb, salonId: string): Promise<void> {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'salon_client:' + salonId}))`;
  }

  /**
   * `last_visit_at` is time-dependent: a client whose only booking is in the future has
   * none today and one tomorrow, with no booking write in between. The sync re-reads
   * every booking and returns early when nothing changed; this is the hook on that
   * path. One indexed read when the booking is a past visit the row does not reflect
   * yet, and a recompute only then — so the counters heal within one slow-lane cycle.
   */
  async isLastVisitStale(
    db: LinkerDb,
    booking: { clientId: string | null; status: string; datetime: Date; endDatetime: Date | null },
    now = new Date(),
  ): Promise<boolean> {
    if (!booking.clientId || BOOKING_CANCELLED_STATUSES.includes(booking.status)) return false;
    if ((booking.endDatetime ?? booking.datetime) >= now) return false;
    const stale = await db.salonClient.findFirst({
      where: { id: booking.clientId, OR: [{ lastVisitAt: null }, { lastVisitAt: { lt: booking.datetime } }] },
      select: { id: true },
    });
    return Boolean(stale);
  }

  /**
   * Re-checks and recomputes. Meant to run inside a transaction that holds the salon
   * lock, after a cheap unlocked `isLastVisitStale` said it is worth opening one — so
   * the common "nothing to do" case costs one read, and the recompute can never
   * overwrite a concurrent writer's fresher counters.
   */
  async refreshLastVisitIfStale(
    db: LinkerDb,
    booking: { clientId: string | null; status: string; datetime: Date; endDatetime: Date | null },
    now = new Date(),
  ): Promise<void> {
    if (await this.isLastVisitStale(db, booking, now)) {
      await this.recomputeCounters(db, [booking.clientId], now);
    }
  }

  /**
   * Recompute many clients of one salon without holding its lock for the whole pass:
   * one short locked transaction per chunk of `COUNTER_CHUNK`. Correct against
   * concurrent booking writes (each chunk reads current state under the lock) while
   * live syncs for the salon only ever wait for one chunk. For the bulk paths — the
   * back-fill's final pass and the Altegio purge; per-booking writes recompute inline.
   */
  async recomputeCountersLocked(
    prisma: PrismaClient,
    salonId: string,
    clientIds: Array<string | null | undefined>,
    now = new Date(),
  ): Promise<void> {
    const unique = Array.from(new Set(clientIds.filter((id): id is string => typeof id === 'string' && id.length > 0)));
    for (let i = 0; i < unique.length; i += COUNTER_CHUNK) {
      const chunk = unique.slice(i, i + COUNTER_CHUNK);
      await prisma.$transaction(async (tx) => {
        await this.lockSalon(tx, salonId);
        await this.recomputeCounters(tx, chunk, now);
      });
    }
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

  // ---- writing ----------------------------------------------------------------------

  private async create(db: LinkerDb, identity: ClientIdentity): Promise<string> {
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

  /**
   * Apply the merge to a matched row. A fill-only identifier can collide with another
   * row's — the same person split across two rows that the rule could not bridge (e.g.
   * one from the app, one from the CRM, spelled differently). The database refuses
   * that; the identifier is then left unset on this row rather than moved, since rows
   * are never merged automatically.
   */
  private async update(db: LinkerDb, existing: SalonClient, identity: ClientIdentity): Promise<string> {
    const data = await this.merge(db, existing, identity);
    if (!data) return existing.id;
    try {
      await db.salonClient.update({ where: { id: existing.id }, data });
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;
      const { userId: _u, altegioClientId: _a, easyweekCustomerId: _e, ...withoutIdentifiers } = data;
      if (Object.keys(withoutIdentifiers).length > 0) {
        await db.salonClient.update({ where: { id: existing.id }, data: withoutIdentifiers });
      }
    }
    return existing.id;
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
      nameKey: nameKeyFor({ firstName, lastName, displayName }),
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

/** Prisma's code for a unique-index violation. */
export function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
}
