import { pullWorkers } from './workers';
import type { AltegioContext } from './context';

/**
 * Trimmed from a real `GET /api/v1/company/{id}/staff` response (2026-09-19):
 * one dismissed member with no linked account, one active member linked to
 * an Altegio user. The staff card's own `email`/`phone` are empty strings on
 * both — the contacts only exist on `user`.
 */
const staffPayload = [
  {
    id: 2918233,
    name: 'Test2 Create2',
    company_id: 1312212,
    specialization: 'Lol2',
    information: '',
    api_id: null,
    fired: 1,
    is_fired: true,
    hidden: 1,
    status: 0,
    user_id: null,
    email: '',
    phone: '',
    avatar: 'https://assets.alteg.io/masters/sm/6/69/69fc6d6c382182c.png',
    avatar_big:
      'https://assets.alteg.io/masters/origin/0/0b/0b82823589e0b45.png',
    position: null,
    user: null,
    is_bookable: false,
    employee: {
      id: 2857113,
      phone: '',
      name: 'Test2 Create2',
      firstname: '',
      surname: '',
    },
  },
  {
    id: 2900381,
    name: 'Roman',
    company_id: 1312212,
    specialization: 'Barber',
    information: '',
    api_id: null,
    fired: 0,
    is_fired: false,
    hidden: 0,
    status: 0,
    user_id: 1584385,
    email: '',
    phone: '',
    avatar: 'https://be.cdn.alteg.io/images/no-master-sm.png',
    avatar_big: 'https://be.cdn.alteg.io/images/no-master.png',
    position: { id: 256063, title: 'Prime Barber' },
    user: {
      id: 1584385,
      name: 'Dima',
      phone: '380950021938',
      email: 'dima@example.com',
      information: '',
      avatar: 'https://be.cdn.alteg.io/images/no-master.png',
      is_approved: true,
      is_salon_representative: false,
    },
    is_bookable: true,
    employee: {
      id: 2839482,
      phone: '',
      name: 'Roman',
      firstname: '',
      surname: '',
    },
  },
];

function contextServing(items: unknown[]): AltegioContext {
  return {
    log: { warn: jest.fn() },
    baseUrl: 'https://api.alteg.io',
    externalSalonId: 1312212,
    http: jest
      .fn()
      .mockResolvedValue(items) as unknown as AltegioContext['http'],
    stripHtml: (html) => (html ? html : undefined),
    requireExternalSalonId: () => 1312212,
  };
}

describe('Altegio pullWorkers', () => {
  it('asks for the company staff list', async () => {
    const ctx = contextServing(staffPayload);
    await pullWorkers(ctx);
    expect(ctx.http).toHaveBeenCalledWith(
      'GET',
      '/api/v1/company/1312212/staff',
    );
  });

  it('takes the contacts from the linked account when the staff card has none', async () => {
    const { items } = await pullWorkers(contextServing(staffPayload));
    const roman = items.find((w) => w.externalId === '2900381');
    expect(roman).toMatchObject({
      name: 'Roman',
      position: 'Barber',
      email: 'dima@example.com',
      phone: '380950021938',
      isActive: true,
    });
  });

  it('leaves the contacts empty for a member with no linked account', async () => {
    const { items } = await pullWorkers(contextServing(staffPayload));
    const test2 = items.find((w) => w.externalId === '2918233');
    expect(test2).toMatchObject({
      name: 'Test2 Create2',
      position: 'Lol2',
      photoUrl:
        'https://assets.alteg.io/masters/origin/0/0b/0b82823589e0b45.png',
      isActive: false,
    });
    expect(test2?.email).toBeUndefined();
    expect(test2?.phone).toBeUndefined();
  });

  it('prefers the staff card over the account, and the HR card as a last resort for the phone', async () => {
    const { items } = await pullWorkers(
      contextServing([
        {
          ...staffPayload[1],
          id: 1,
          email: 'card@example.com',
          phone: '380000000001',
        },
        {
          ...staffPayload[1],
          id: 2,
          user: null,
          employee: { id: 9, phone: '380000000002' },
        },
      ]),
    );
    expect(items[0]).toMatchObject({
      email: 'card@example.com',
      phone: '380000000001',
    });
    expect(items[1]).toMatchObject({ email: undefined, phone: '380000000002' });
  });
});
