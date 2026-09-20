import { SalonClientLinker } from '../../../src/salon-clients/salon-client-linker.service';
import { buildNameKey, type ClientIdentity } from '../../../src/salon-clients/client-identity';
import { createFakeDb } from '../utils/fake-db';

// BEA-71: one row per person per salon. An account id or the CRM's own client id
// identify a person on their own; a phone or an email only together with the name
// (decision 2026-09-20 — shared phones and household emails would otherwise merge
// different people). Rows are never merged automatically.
describe('SalonClientLinker', () => {
  const linker = new SalonClientLinker();
  const salonId = 'salon-1';
  const t = (iso: string) => new Date(iso);

  const ivan = { firstName: 'Іван', lastName: 'Петренко', displayName: 'Іван Петренко' };
  const P = '+380950000001';

  const identity = (over: Partial<ClientIdentity> = {}): ClientIdentity => ({
    salonId,
    userId: null,
    altegioClientId: null,
    easyweekCustomerId: null,
    name: ivan,
    // Computed, not spelled out: the key sorts tokens by code point, and Cyrillic
    // "п" sorts before "і", so guessing it by eye is how the first draft went wrong.
    nameKey: buildNameKey(over.name ?? ivan),
    phone: null,
    email: null,
    bookingDatetime: t('2026-06-01T10:00:00Z'),
    ...over,
  });

  describe('link — matching', () => {
    it('returns null and writes nothing when there is no usable identity', async () => {
      const db = createFakeDb();
      const id = await linker.link(db, identity({ nameKey: null, name: { firstName: null, lastName: null, displayName: null }, phone: P }));
      expect(id).toBeNull();
      expect(db.$queryRaw).not.toHaveBeenCalled();
      expect(db.salonClient.create).not.toHaveBeenCalled();
    });

    it('takes the per-salon advisory lock before looking anything up', async () => {
      const db = createFakeDb();
      await linker.link(db, identity({ userId: 'u1' }));
      expect(db.$queryRaw).toHaveBeenCalledTimes(1);
      const [strings, ...values] = db.$queryRaw.mock.calls[0];
      expect(strings.join('?')).toContain('pg_advisory_xact_lock(hashtext(?))');
      expect(values).toEqual([`salon_client:${salonId}`]);
      expect(db.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(db.salonClient.findFirst.mock.invocationCallOrder[0]);
    });

    // Scenario 1: app first, then the CRM sync returns the same booking with a card.
    it('learns the CRM id on a row matched by account, and then matches walk-ins by that id', async () => {
      const db = createFakeDb();
      const first = await linker.link(db, identity({ userId: 'u1', phone: P }));
      const synced = await linker.link(db, identity({ userId: 'u1', altegioClientId: 'A1', phone: P }));
      const walkIn = await linker.link(db, identity({ altegioClientId: 'A1', phone: P }));
      expect(synced).toBe(first);
      expect(walkIn).toBe(first);
      expect(db.clients).toHaveLength(1);
      expect(db.clients[0]).toMatchObject({ userId: 'u1', altegioClientId: 'A1' });
    });

    // Scenario 2: CRM first, then the app with the same name and phone.
    it('matches an app booking to a CRM row by name and phone, and learns the account', async () => {
      const db = createFakeDb();
      const crm = await linker.link(db, identity({ altegioClientId: 'A1', name: { ...ivan, displayName: 'Петренко Іван' }, phone: P }));
      const app = await linker.link(db, identity({ userId: 'u1', phone: P }));
      expect(app).toBe(crm);
      expect(db.clients[0]).toMatchObject({ userId: 'u1', altegioClientId: 'A1' });
    });

    // Scenario 3: the case phone-only matching gets wrong.
    it('keeps two people who share a phone apart', async () => {
      const db = createFakeDb();
      const mother = await linker.link(
        db,
        identity({ name: { firstName: 'Марія', lastName: 'Петренко', displayName: 'Марія Петренко' }, phone: P }),
      );
      const son = await linker.link(db, identity({ phone: P }));
      expect(son).not.toBe(mother);
      expect(db.clients).toHaveLength(2);
    });

    // Scenario 4: an accepted consequence of the strict rule.
    it('creates two rows for one person spelled differently across sources', async () => {
      const db = createFakeDb();
      await linker.link(db, identity({ altegioClientId: 'A1', name: { firstName: 'Дмитро', lastName: 'Погребняк', displayName: null }, phone: P }));
      await linker.link(db, identity({ userId: 'u1', name: { firstName: 'Dima', lastName: 'Pohrebniak', displayName: null }, phone: P }));
      expect(db.clients).toHaveLength(2);
    });

    it('never links on phone alone or email alone', async () => {
      const db = createFakeDb();
      await linker.link(db, identity({ altegioClientId: 'A1', phone: P, email: 'ivan@example.com' }));
      db.salonClient.findFirst.mockClear();
      // Same phone and email, no name: not even a lookup on those columns.
      const nameless = identity({ altegioClientId: 'A2', nameKey: null, name: { firstName: null, lastName: null, displayName: null }, phone: P, email: 'ivan@example.com' });
      const id = await linker.link(db, nameless);
      expect(id).not.toBe(db.clients[0].id);
      const wheres = db.salonClient.findFirst.mock.calls.map(([args]: any) => args.where);
      expect(wheres.some((w) => 'phone' in w || 'email' in w)).toBe(false);
    });

    it('matches by name and email when there is no phone', async () => {
      const db = createFakeDb();
      const a = await linker.link(db, identity({ easyweekCustomerId: 'ew-1', email: 'ivan@example.com' }));
      const b = await linker.link(db, identity({ email: 'ivan@example.com' }));
      expect(b).toBe(a);
    });

    it('does not use a free-text phone or a junk email as a key', async () => {
      const db = createFakeDb();
      await linker.link(db, identity({ altegioClientId: 'A1', phone: 'call after 5pm', email: 'none' }));
      const id = await linker.link(db, identity({ phone: 'call after 5pm', email: 'none' }));
      expect(id).toBeNull();
      expect(db.clients).toHaveLength(1);
    });

    // Scenario 6.
    it('never shares a row across salons', async () => {
      const db = createFakeDb();
      const s1 = await linker.link(db, identity({ userId: 'u1', phone: P }));
      const s2 = await linker.link(db, identity({ salonId: 'salon-2', userId: 'u1', phone: P }));
      expect(s2).not.toBe(s1);
      expect(db.clients.map((c) => c.salonId).sort()).toEqual(['salon-1', 'salon-2']);
    });

    it('stops at the first hit', async () => {
      const db = createFakeDb();
      await linker.link(db, identity({ userId: 'u1', altegioClientId: 'A1', phone: P }));
      db.salonClient.findFirst.mockClear();
      await linker.link(db, identity({ userId: 'u1', altegioClientId: 'A1', phone: P, email: 'ivan@example.com' }));
      expect(db.salonClient.findFirst).toHaveBeenCalledTimes(1);
      expect(db.salonClient.findFirst.mock.calls[0][0].where).toEqual({ salonId, userId: 'u1' });
    });

    it('prefers the oldest row when several carry the same key', async () => {
      const db = createFakeDb();
      const now = new Date();
      const rowOf = (id: string, firstSeenAt: Date) => ({
        id, salonId, displayName: 'Іван Петренко', firstName: 'Іван', lastName: 'Петренко',
        phone: P, email: null, avatarUrl: null, userId: null, altegioClientId: 'A1', easyweekCustomerId: null,
        firstSeenAt, lastVisitAt: null, bookingsCount: 0, createdAt: now, updatedAt: now,
      });
      db.clients.push(rowOf('newer', t('2026-05-01T00:00:00Z')), rowOf('older', t('2026-01-01T00:00:00Z')));
      expect(await linker.link(db, identity({ altegioClientId: 'A1' }))).toBe('older');
    });
  });

  describe('link — merging', () => {
    it('fills identifiers once and keeps them', async () => {
      const db = createFakeDb();
      await linker.link(db, identity({ userId: 'u1', altegioClientId: 'A1', phone: P }));
      // A second Altegio card for the same person, matched via the account.
      await linker.link(db, identity({ userId: 'u1', altegioClientId: 'A2', phone: P }));
      expect(db.clients[0].altegioClientId).toBe('A1');
    });

    it('lets a CRM edit propagate but never blanks a field', async () => {
      const db = createFakeDb();
      await linker.link(db, identity({ userId: 'u1', phone: P, email: 'ivan@example.com' }));
      await linker.link(db, identity({ userId: 'u1', phone: '+380950000002', email: null }));
      expect(db.clients[0]).toMatchObject({ phone: '+380950000002', email: 'ivan@example.com' });
    });

    it('recomputes the name key after a rename', async () => {
      const db = createFakeDb();
      await linker.link(db, identity({ userId: 'u1', phone: P }));
      await linker.link(db, identity({ userId: 'u1', name: { firstName: 'Іван', lastName: 'Коваль', displayName: 'Іван Коваль' } }));
      expect(db.clients[0]).toMatchObject({ lastName: 'Коваль', displayName: 'Іван Коваль' });
    });

    it('does not replace a good phone with free text', async () => {
      const db = createFakeDb();
      await linker.link(db, identity({ userId: 'u1', phone: P }));
      await linker.link(db, identity({ userId: 'u1', phone: 'call after 5pm' }));
      expect(db.clients[0].phone).toBe(P);
    });

    it('does fill a missing phone with whatever the CRM has', async () => {
      const db = createFakeDb();
      await linker.link(db, identity({ userId: 'u1' }));
      await linker.link(db, identity({ userId: 'u1', phone: 'call after 5pm' }));
      expect(db.clients[0].phone).toBe('call after 5pm');
    });

    it('keeps the earliest booking as first_seen_at', async () => {
      const db = createFakeDb();
      await linker.link(db, identity({ userId: 'u1', bookingDatetime: t('2026-06-01T10:00:00Z') }));
      await linker.link(db, identity({ userId: 'u1', bookingDatetime: t('2026-02-01T10:00:00Z') }));
      await linker.link(db, identity({ userId: 'u1', bookingDatetime: t('2026-08-01T10:00:00Z') }));
      expect(db.clients[0].firstSeenAt).toEqual(t('2026-02-01T10:00:00Z'));
    });

    it('issues no update when nothing changed', async () => {
      const db = createFakeDb();
      const same = identity({ userId: 'u1', phone: P, email: 'ivan@example.com' });
      await linker.link(db, same);
      await linker.link(db, same);
      expect(db.salonClient.update).not.toHaveBeenCalled();
    });

    it('takes the avatar from the account, on create and when the account is learned', async () => {
      const db = createFakeDb();
      db.accounts['u1'] = { avatarUrl: 'https://cdn/u1.png' };
      await linker.link(db, identity({ altegioClientId: 'A1', phone: P }));
      expect(db.clients[0].avatarUrl).toBeNull();
      await linker.link(db, identity({ userId: 'u1', phone: P }));
      expect(db.clients[0].avatarUrl).toBe('https://cdn/u1.png');
    });
  });

  describe('recomputeCounters', () => {
    const now = t('2026-06-15T12:00:00Z');

    it('counts non-cancelled bookings and takes the latest past one as the last visit', async () => {
      const db = createFakeDb();
      const id = (await linker.link(db, identity({ userId: 'u1' })))!;
      db.bookings.push(
        { id: 'b1', clientId: id, status: 'completed', datetime: t('2026-05-01T10:00:00Z'), endDatetime: t('2026-05-01T11:00:00Z') },
        { id: 'b2', clientId: id, status: 'created', datetime: t('2026-06-10T10:00:00Z'), endDatetime: null }, // past, no end
        { id: 'b3', clientId: id, status: 'created', datetime: t('2026-07-01T10:00:00Z'), endDatetime: null }, // future
        { id: 'b4', clientId: id, status: 'canceled', datetime: t('2026-06-12T10:00:00Z'), endDatetime: null },
        { id: 'b5', clientId: id, status: 'deleted', datetime: t('2026-06-13T10:00:00Z'), endDatetime: null },
        { id: 'b6', clientId: 'someone-else', status: 'created', datetime: t('2026-06-14T10:00:00Z'), endDatetime: null },
      );
      await linker.recomputeCounters(db, [id], now);
      expect(db.clients[0]).toMatchObject({ bookingsCount: 3, lastVisitAt: t('2026-06-10T10:00:00Z') });
    });

    it('zeroes a client whose only booking was cancelled', async () => {
      const db = createFakeDb();
      const id = (await linker.link(db, identity({ userId: 'u1' })))!;
      db.bookings.push({ id: 'b1', clientId: id, status: 'canceled', datetime: t('2026-05-01T10:00:00Z'), endDatetime: null });
      await linker.recomputeCounters(db, [id], now);
      expect(db.clients[0]).toMatchObject({ bookingsCount: 0, lastVisitAt: null });
    });

    it('dedupes ids and skips nulls', async () => {
      const db = createFakeDb();
      const id = (await linker.link(db, identity({ userId: 'u1' })))!;
      await linker.recomputeCounters(db, [id, null, id, undefined], now);
      expect(db.salonClient.updateMany).toHaveBeenCalledTimes(1);
    });
  });
});
