import { BookingHandlerService } from '../src/booking/booking-handler.service';

// BEA-68 denormalises the booking's client onto the row. The value comes from the CRM
// record when it has one and from the account that booked when it does not, and it
// takes part in change detection so a CRM-side edit is not swallowed by the early
// return in the sync update paths.
describe('BookingHandlerService — client snapshot', () => {
  let usersFindUnique: jest.Mock;
  let service: BookingHandlerService;

  const call = (method: string, ...args: unknown[]) =>
    (service as any)[method](...args);

  beforeEach(() => {
    usersFindUnique = jest.fn().mockResolvedValue(null);
    service = new BookingHandlerService({
      users: { findUnique: usersFindUnique },
    } as any);
  });

  describe('phone normalisation', () => {
    it('adds the + Altegio omits, so bare digits become E.164', () => {
      // Altegio sends "380950000001"; libphonenumber cannot infer a country without
      // the +, and there is no sensible default country to pass it.
      expect(call('toE164', '380950000001')).toBe('+380950000001');
    });

    it('leaves an already-E.164 EasyWeek number alone', () => {
      expect(call('toE164', '+380950000001')).toBe('+380950000001');
    });

    it('keeps an unparseable value rather than dropping it', () => {
      // A malformed number still tells an owner something; an empty cell does not.
      expect(call('toE164', 'ext. 4417')).toBe('ext. 4417');
    });

    it('drops free text too long for the column instead of failing the write', () => {
      // CRM phone fields sometimes hold notes rather than a number. `client_phone`
      // is VARCHAR(30); letting a longer value through would fail the INSERT and
      // abort the booking write — and, on a sync run, the job.
      const notes = 'call after 5pm, ask for John or Mary';
      expect(notes.length).toBeGreaterThan(30);
      expect(call('toE164', notes)).toBeNull();
    });

    it('keeps a short unparseable value, which still fits', () => {
      expect(call('toE164', 'ext. 4417')).toBe('ext. 4417');
    });

    it('treats blank and non-string input as absent', () => {
      expect(call('toE164', '   ')).toBeNull();
      expect(call('toE164', null)).toBeNull();
      expect(call('toE164', 42)).toBeNull();
    });
  });

  describe('from an EasyWeek customer', () => {
    // Shape taken from a real booking payload, not invented.
    const customer = {
      uuid: 'ac50aed4-cdea-48a8-bd63-07ffac88801e',
      firstName: 'First',
      lastName: 'Customer',
      middleName: null,
      phone: '+380950000001',
      email: 'first@customer.com',
    };

    it('joins the name and keeps phone/email, tagged easyweek', () => {
      expect(call('clientFromEasyweekCustomer', customer)).toEqual({
        clientName: 'First Customer',
        clientPhone: '+380950000001',
        clientEmail: 'first@customer.com',
        clientSource: 'easyweek',
      });
    });

    it('copes with a half-filled customer', () => {
      const snapshot = call('clientFromEasyweekCustomer', {
        firstName: 'Solo',
      });
      expect(snapshot.clientName).toBe('Solo');
      expect(snapshot.clientPhone).toBeNull();
      expect(snapshot.clientEmail).toBeNull();
    });

    it('is empty when there is no customer at all', () => {
      expect(call('clientFromEasyweekCustomer', null).clientSource).toBeNull();
    });
  });

  describe('from an Altegio client', () => {
    it('prefers display_name and normalises the phone', () => {
      expect(
        call('clientFromAltegioClient', {
          displayName: 'Ivan Petrenko',
          name: 'Ivan',
          surname: 'Petrenko',
          phone: '380501234567',
          email: 'ivan@example.com',
        }),
      ).toEqual({
        clientName: 'Ivan Petrenko',
        clientPhone: '+380501234567',
        clientEmail: 'ivan@example.com',
        clientSource: 'altegio',
      });
    });

    it('falls back to name + surname when there is no display name', () => {
      const snapshot = call('clientFromAltegioClient', {
        name: 'Ivan',
        surname: 'Petrenko',
      });
      expect(snapshot.clientName).toBe('Ivan Petrenko');
    });
  });

  describe('resolution and the account fallback', () => {
    const account = {
      name: 'Olena',
      secondName: 'Kovalenko',
      phone: '+380671234567',
      email: 'owner@beautyn.test',
    };

    it('keeps the CRM client and never touches the users table', async () => {
      const fromCrm = call('clientFromAltegioClient', {
        displayName: 'Ivan',
        phone: '380501234567',
      });
      const resolved = await call('resolveClientSnapshot', fromCrm, 'user-1');

      expect(resolved.clientName).toBe('Ivan');
      expect(resolved.clientSource).toBe('altegio');
      expect(usersFindUnique).not.toHaveBeenCalled();
    });

    it('falls back to the account when the CRM gave nothing', async () => {
      usersFindUnique.mockResolvedValue(account);
      const empty = call('clientFromEasyweekCustomer', null);

      const resolved = await call('resolveClientSnapshot', empty, 'user-1');

      expect(resolved).toEqual({
        clientName: 'Olena Kovalenko',
        clientPhone: '+380671234567',
        clientEmail: 'owner@beautyn.test',
        clientSource: 'user',
      });
    });

    it('treats Altegio’s all-nulls client row as no client at all', async () => {
      // mapAltegioClient returns an object of nulls rather than null when Altegio
      // sent no client, so the fallback has to be driven by content, not presence.
      usersFindUnique.mockResolvedValue(account);
      const allNulls = call('clientFromAltegioClient', {
        displayName: null,
        name: null,
        surname: null,
        phone: null,
        email: null,
      });

      const resolved = await call('resolveClientSnapshot', allNulls, 'user-1');

      expect(resolved.clientSource).toBe('user');
      expect(resolved.clientName).toBe('Olena Kovalenko');
    });

    it('returns an empty snapshot when there is neither a CRM client nor an account', async () => {
      const resolved = await call(
        'resolveClientSnapshot',
        call('clientFromEasyweekCustomer', null),
        null,
      );
      expect(resolved).toEqual({
        clientName: null,
        clientPhone: null,
        clientEmail: null,
        clientSource: null,
      });
      expect(usersFindUnique).not.toHaveBeenCalled();
    });

    it('does not invent a client from an account row that is itself empty', async () => {
      usersFindUnique.mockResolvedValue({
        name: null,
        secondName: null,
        phone: null,
        email: null,
      });
      const resolved = await call(
        'resolveClientSnapshot',
        call('clientFromEasyweekCustomer', null),
        'user-1',
      );
      expect(resolved.clientSource).toBeNull();
    });
  });

  describe('change detection', () => {
    const baseArgs = {
      salonId: 'salon-1',
      userId: null,
      status: 'created',
      datetime: new Date('2026-10-22T12:00:00Z'),
      endDatetime: null,
      comment: null,
      crmRecordId: 'ew-1',
      crmCompanyId: null,
      shortLink: null,
      crmPayload: null,
      links: [],
      orderedServices: [],
      order: null,
      duration: null,
    };

    const snapshotWith = (client: Record<string, unknown>) =>
      call('buildEasyweekIncomingState', { ...baseArgs, client }).snapshot;

    it('notices a client-only change', () => {
      // Without the client in the snapshot, renaming a client in the CRM would
      // compare equal and the sync would skip the write entirely.
      const before = snapshotWith({
        clientName: 'First Customer',
        clientPhone: '+380950000001',
        clientEmail: null,
        clientSource: 'easyweek',
      });
      const after = snapshotWith({
        clientName: 'Renamed Customer',
        clientPhone: '+380950000001',
        clientEmail: null,
        clientSource: 'easyweek',
      });

      expect(after).not.toEqual(before);
    });

    it('builds incoming and existing snapshots with matching client keys', () => {
      // Asymmetry here would make every booking compare as changed, forever.
      const client = {
        clientName: 'First Customer',
        clientPhone: '+380950000001',
        clientEmail: 'first@customer.com',
        clientSource: 'easyweek',
      };
      const incoming = snapshotWith(client);
      const existing = call('buildEasyweekExistingState', {
        salonId: baseArgs.salonId,
        userId: null,
        status: baseArgs.status,
        datetime: baseArgs.datetime,
        endDatetime: null,
        comment: null,
        crmType: 'EASYWEEK',
        crmRecordId: baseArgs.crmRecordId,
        crmCompanyId: null,
        crmStaffId: null,
        crmServiceIds: null,
        serviceIds: null,
        shortLink: null,
        crmPayload: null,
        ...client,
      }).snapshot;

      expect(Object.keys(existing.booking).sort()).toEqual(
        Object.keys(incoming.booking).sort(),
      );
      expect(existing).toEqual(incoming);
    });
  });
});
