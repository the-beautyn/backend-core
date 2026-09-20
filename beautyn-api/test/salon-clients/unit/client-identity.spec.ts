import {
  buildNameKey,
  hasIdentity,
  nameKeyFor,
  identityFromBookingRow,
  identityFromSources,
  isE164,
  isPlausibleEmail,
  readEasyweekCustomer,
} from '../../../src/salon-clients/client-identity';
import { clientFromAltegioClient, clientFromEasyweekCustomer, EMPTY_CLIENT } from '../../../src/booking/client-snapshot';

// BEA-71: the identity is what the linker matches on. It must come out the same
// whether built from the handler's in-memory data or from a stored booking row, or
// the back-fill and the sync create different people.
describe('client identity', () => {
  const when = new Date('2026-09-01T10:00:00Z');

  describe('buildNameKey', () => {
    it('ignores order, case and whitespace', () => {
      const a = buildNameKey({ firstName: 'Іван', lastName: 'Петренко', displayName: null });
      const b = buildNameKey({ firstName: null, lastName: null, displayName: 'ПЕТРЕНКО   іван' });
      expect(a).toBe('петренко іван');
      expect(b).toBe(a);
    });

    it('unifies apostrophe variants and keeps Cyrillic verbatim', () => {
      const straight = buildNameKey({ firstName: "Мар'яна", lastName: 'Коваль', displayName: null });
      const curly = buildNameKey({ firstName: 'Мар’яна', lastName: 'Коваль', displayName: null });
      expect(straight).toBe(curly);
      expect(straight).toBe("коваль мар'яна");
    });

    // Deliberately strict: a phone match is only trusted when the name agrees, so a
    // patronymic, a missing surname or a transliteration must all be different keys.
    it('treats partial, patronymic and transliterated names as different people', () => {
      const full = buildNameKey({ firstName: 'Іван', lastName: 'Петренко', displayName: null });
      expect(buildNameKey({ firstName: 'Іван', lastName: null, displayName: null })).not.toBe(full);
      expect(buildNameKey({ firstName: null, lastName: null, displayName: 'Іван Петрович Петренко' })).not.toBe(full);
      expect(buildNameKey({ firstName: 'Ivan', lastName: 'Petrenko', displayName: null })).not.toBe(full);
    });

    it('prefers the structured name over the display name', () => {
      // Altegio display names sometimes carry a nickname or patronymic.
      const key = buildNameKey({ firstName: 'Іван', lastName: 'Петренко', displayName: 'Іван Петрович Петренко (постійний)' });
      expect(key).toBe('петренко іван');
    });

    it('is null for nothing', () => {
      expect(buildNameKey({ firstName: null, lastName: null, displayName: null })).toBeNull();
      expect(buildNameKey({ firstName: '  ', lastName: null, displayName: '—' })).toBeNull();
      expect(buildNameKey(null)).toBeNull();
    });
  });

  describe('key checks', () => {
    it('accepts only true E.164 phones', () => {
      expect(isE164('+380950000001')).toBe(true);
      expect(isE164('380950000001')).toBe(false);
      expect(isE164('call after 5pm')).toBe(false);
      expect(isE164(null)).toBe(false);
    });

    it('accepts only plausible emails', () => {
      expect(isPlausibleEmail('ivan@example.com')).toBe(true);
      expect(isPlausibleEmail('none')).toBe(false);
      expect(isPlausibleEmail('a@b')).toBe(false);
    });
  });

  describe('hasIdentity', () => {
    const base = {
      salonId: 's1',
      userId: null,
      altegioClientId: null,
      easyweekCustomerId: null,
      name: { firstName: 'Іван', lastName: 'Петренко', displayName: 'Іван Петренко' },
      nameKey: 'петренко іван',
      phone: null,
      email: null,
      bookingDatetime: when,
    };

    it('is true for an account or a CRM id alone', () => {
      expect(hasIdentity({ ...base, userId: 'u1' })).toBe(true);
      expect(hasIdentity({ ...base, altegioClientId: '123' })).toBe(true);
      expect(hasIdentity({ ...base, easyweekCustomerId: 'uuid' })).toBe(true);
    });

    // The 2026-09-20 decision: contact details never identify a person on their own.
    it('is false for a phone or email without a name', () => {
      expect(hasIdentity({ ...base, nameKey: null, phone: '+380950000001' })).toBe(false);
      expect(hasIdentity({ ...base, nameKey: null, email: 'ivan@example.com' })).toBe(false);
    });

    it('is true for a name together with an E.164 phone or a plausible email', () => {
      expect(hasIdentity({ ...base, phone: '+380950000001' })).toBe(true);
      expect(hasIdentity({ ...base, email: 'ivan@example.com' })).toBe(true);
    });

    it('is false for a name with only free-text contact', () => {
      expect(hasIdentity({ ...base, phone: 'call after 5pm', email: 'none' })).toBe(false);
      expect(hasIdentity({ ...base })).toBe(false);
    });
  });

  describe('identityFromSources', () => {
    it('takes the name from the same source as the snapshot', () => {
      const customer = { uuid: 'ew-1', firstName: 'Іван', lastName: 'Петренко', phone: '+380950000001', email: 'Ivan@Example.com' };
      const identity = identityFromSources({
        salonId: 's1',
        userId: null,
        snapshot: clientFromEasyweekCustomer(customer),
        easyweekCustomer: customer,
        bookingDatetime: when,
      });
      expect(identity).toMatchObject({
        easyweekCustomerId: 'ew-1',
        altegioClientId: null,
        name: { firstName: 'Іван', lastName: 'Петренко', displayName: 'Іван Петренко' },
        nameKey: 'петренко іван',
        phone: '+380950000001',
        email: 'ivan@example.com',
      });
    });

    it('reads the Altegio client id and display name', () => {
      const client = { externalId: '777', name: 'Іван', surname: 'Петренко', displayName: 'Петренко Іван', phone: '380950000001', email: null };
      const identity = identityFromSources({
        salonId: 's1',
        userId: null,
        snapshot: clientFromAltegioClient(client),
        altegioClient: client,
        bookingDatetime: when,
      });
      expect(identity.altegioClientId).toBe('777');
      expect(identity.name.displayName).toBe('Петренко Іван');
      expect(identity.nameKey).toBe('петренко іван');
      expect(identity.phone).toBe('+380950000001');
    });

    it('falls back to the account name when the CRM gave no client', () => {
      const account = { name: 'Іван', secondName: 'Петренко', phone: '+380950000001', email: 'ivan@example.com' };
      const identity = identityFromSources({
        salonId: 's1',
        userId: 'u1',
        snapshot: { clientName: 'Іван Петренко', clientPhone: '+380950000001', clientEmail: 'ivan@example.com', clientSource: 'user' },
        altegioClient: { externalId: null, name: null, surname: null, displayName: null },
        account,
        bookingDatetime: when,
      });
      expect(identity.userId).toBe('u1');
      expect(identity.nameKey).toBe('петренко іван');
    });

    it('has no identity when nothing is known', () => {
      const identity = identityFromSources({ salonId: 's1', userId: null, snapshot: EMPTY_CLIENT, bookingDatetime: when });
      expect(identity.nameKey).toBeNull();
      expect(hasIdentity(identity)).toBe(false);
    });
  });

  describe('identityFromBookingRow', () => {
    it('recovers the EasyWeek customer uuid and name from the raw payload', () => {
      const row = {
        salonId: 's1',
        userId: null,
        datetime: when,
        crmType: 'EASYWEEK',
        crmPayload: { customer: { uuid: 'ew-1', first_name: 'Іван', last_name: 'Петренко', phone: '+380950000001' } },
        clientName: 'Іван Петренко',
        clientPhone: '+380950000001',
        clientEmail: null,
        clientSource: 'easyweek',
      };
      const identity = identityFromBookingRow(row);
      expect(identity.easyweekCustomerId).toBe('ew-1');
      expect(identity.nameKey).toBe('петренко іван');
    });

    it('recovers the Altegio card from the persisted details', () => {
      const row = {
        salonId: 's1',
        userId: null,
        datetime: when,
        crmType: 'ALTEGIO',
        crmPayload: {},
        clientName: 'Петренко Іван',
        clientPhone: '+380950000001',
        clientEmail: null,
        clientSource: 'altegio',
        altegioDetails: { client: { externalId: '777', name: 'Іван', surname: 'Петренко', displayName: 'Петренко Іван' } },
      };
      const identity = identityFromBookingRow(row);
      expect(identity.altegioClientId).toBe('777');
      expect(identity.nameKey).toBe('петренко іван');
    });

    // The same person as the handler saw: a stored row and the live payload must agree.
    it('matches what the handler derives from the live payload', () => {
      const customer = { uuid: 'ew-1', firstName: 'Іван', lastName: 'Петренко', phone: '+380950000001', email: 'ivan@example.com' };
      const live = identityFromSources({
        salonId: 's1',
        userId: null,
        snapshot: clientFromEasyweekCustomer(customer),
        easyweekCustomer: customer,
        bookingDatetime: when,
      });
      const stored = identityFromBookingRow({
        salonId: 's1',
        userId: null,
        datetime: when,
        crmType: 'EASYWEEK',
        crmPayload: { customer: { uuid: 'ew-1', first_name: 'Іван', last_name: 'Петренко', phone: '+380950000001', email: 'ivan@example.com' } },
        clientName: 'Іван Петренко',
        clientPhone: '+380950000001',
        clientEmail: 'ivan@example.com',
        clientSource: 'easyweek',
      });
      expect(stored).toEqual(live);
    });

    it('uses the account the caller loaded for app bookings', () => {
      const identity = identityFromBookingRow(
        {
          salonId: 's1',
          userId: 'u1',
          datetime: when,
          crmType: 'ALTEGIO',
          crmPayload: {},
          clientName: 'Іван Петренко',
          clientPhone: '+380950000001',
          clientEmail: null,
          clientSource: 'user',
          altegioDetails: { client: { externalId: null, name: null, surname: null, displayName: null } },
        },
        { name: 'Іван', secondName: 'Петренко' },
      );
      expect(identity.userId).toBe('u1');
      expect(identity.nameKey).toBe('петренко іван');
    });
  });

  // CRM data lands in bounded columns; an overlong value must not fail the booking write.
  describe('column bounds', () => {
    const long = (n: number) => 'x'.repeat(n);

    it('cuts names to their column width and the key to its own', () => {
      const identity = identityFromSources({
        salonId: 's1',
        userId: null,
        snapshot: { clientName: 'n', clientPhone: null, clientEmail: null, clientSource: 'easyweek' },
        easyweekCustomer: { uuid: 'ew-1', firstName: long(150), lastName: long(150) },
        bookingDatetime: when,
      });
      expect(identity.name.firstName).toHaveLength(100);
      expect(identity.name.lastName).toHaveLength(100);
      // Two 100-char names plus a space do not fit the key column. A cut key could
      // collide with another long name and merge two people; no key is the safe answer.
      expect(identity.nameKey).toBeNull();
      expect(hasIdentity(identity)).toBe(true); // the CRM id still identifies the person
    });

    it('keeps a key whose components are within their columns', () => {
      expect(nameKeyFor({ firstName: 'x'.repeat(99), lastName: 'y'.repeat(99), displayName: null })).toHaveLength(199);
    });

    // A name cut to its column would collide with every other name sharing its first
    // 100 characters; a component at or beyond the width therefore yields no key —
    // both for an incoming long name and for a stored value that was cut.
    it('gives no key when a component is at or beyond its column width, even if the joined key would fit', () => {
      const identity = identityFromSources({
        salonId: 's1',
        userId: null,
        snapshot: { clientName: 'n', clientPhone: '+380950000001', clientEmail: null, clientSource: 'altegio' },
        altegioClient: { externalId: '1', name: 'x'.repeat(150), surname: 'Іван' },
        bookingDatetime: when,
      });
      expect(identity.name.firstName).toHaveLength(100);
      expect(identity.nameKey).toBeNull();
      expect(nameKeyFor({ firstName: 'x'.repeat(100), lastName: 'Іван', displayName: null })).toBeNull();
      expect(buildNameKey({ firstName: 'x'.repeat(200), lastName: null, displayName: null })).toBeNull(); // the joined-length guard still holds
    });

    it('drops an identifier, phone or email that cannot be genuine at that length', () => {
      const identity = identityFromSources({
        salonId: 's1',
        userId: null,
        snapshot: { clientName: 'n', clientPhone: long(31), clientEmail: `${long(250)}@example.com`, clientSource: 'altegio' },
        altegioClient: { externalId: long(129), name: 'Іван', surname: 'Петренко' },
        bookingDatetime: when,
      });
      expect(identity.altegioClientId).toBeNull();
      expect(identity.phone).toBeNull();
      expect(identity.email).toBeNull();
    });
  });

  it('readEasyweekCustomer tolerates missing or malformed payloads', () => {
    expect(readEasyweekCustomer(null)).toBeNull();
    expect(readEasyweekCustomer({ customer: 'nope' })).toBeNull();
    expect(readEasyweekCustomer({ customer: { uuid: 'x', first_name: 'A' } })).toMatchObject({ uuid: 'x', firstName: 'A', lastName: null });
  });
});
