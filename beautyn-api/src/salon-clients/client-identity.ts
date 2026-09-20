import { CrmType } from '@crm/shared';
import {
  cleanName,
  clientFromRow,
  normalizeEmail,
  type ClientSnapshot,
} from '../booking/client-snapshot';

/**
 * Who a booking is for, in the shape the salon-client linker matches on (BEA-71).
 *
 * Kept apart from `ClientSnapshot`: the snapshot is spread straight into the booking
 * row, so it cannot grow fields that have no column. This type carries the extra
 * evidence — account id, CRM client id, structured name — that decides whether two
 * bookings belong to the same person.
 *
 * Pure module for the same reason `client-snapshot.ts` is: the booking handler, the
 * self-heal path and the back-fill script must all derive the same identity from the
 * same input, or the rows they create disagree.
 */
export type ClientName = {
  firstName: string | null;
  lastName: string | null;
  /** What the panel shows: "First Last", or the CRM's own display name. */
  displayName: string | null;
};

export type ClientIdentity = {
  salonId: string;
  userId: string | null;
  altegioClientId: string | null;
  easyweekCustomerId: string | null;
  name: ClientName;
  /** `buildNameKey(name)`. */
  nameKey: string | null;
  /** Already through `toE164` (the snapshot's phone). */
  phone: string | null;
  /** Already through `normalizeEmail`. */
  email: string | null;
  /** The booking's start; feeds `first_seen_at`. */
  bookingDatetime: Date;
};

export const EMPTY_NAME: ClientName = { firstName: null, lastName: null, displayName: null };

/**
 * Column widths from schema.prisma. CRM data is copied into bounded columns, and a
 * valid-looking but overlong value must not fail the booking write it rides on.
 * Names are cut to width; an identifier or address that long is junk and is dropped.
 */
export const CLIENT_COLUMN_LIMITS = {
  firstName: 100,
  lastName: 100,
  nameKey: 200,
  phone: 30,
  email: 255,
  externalId: 128,
} as const;

const cut = (value: string | null, max: number): string | null =>
  value == null ? null : value.length > max ? value.slice(0, max) : value;
const dropIfLonger = (value: string | null, max: number): string | null =>
  value != null && value.length > max ? null : value;

/** A true E.164 number — what `toE164` returns on success. Its raw-string fallback never matches. */
const E164 = /^\+[1-9]\d{6,14}$/;
/** Loose shape check; CRM email fields sometimes hold junk that must not become a key. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isE164(phone: string | null | undefined): phone is string {
  return typeof phone === 'string' && E164.test(phone);
}

export function isPlausibleEmail(email: string | null | undefined): email is string {
  return typeof email === 'string' && EMAIL_SHAPE.test(email);
}

/**
 * Order-, case- and whitespace-insensitive key of a person's name, so Altegio's
 * "Петренко Іван" and EasyWeek's "Іван Петренко" agree. Otherwise exact: a patronymic,
 * a missing surname or a transliteration all produce a different key, and that is
 * deliberate — a phone or email match is only trusted when the name agrees too.
 *
 * First + last name when either is present; the display name only as a fallback, since
 * Altegio display names sometimes carry the patronymic or a nickname.
 */
export function buildNameKey(name: ClientName | null | undefined): string | null {
  if (!name) return null;
  const source =
    name.firstName || name.lastName ? `${name.firstName ?? ''} ${name.lastName ?? ''}` : (name.displayName ?? '');
  const tokens = source
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’ʼ`´]/g, "'")
    .replace(/[^\p{L}\p{N}'\-\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .sort();
  return tokens.length ? cut(tokens.join(' '), CLIENT_COLUMN_LIMITS.nameKey) : null;
}

export function hasIdentity(identity: ClientIdentity): boolean {
  if (identity.userId || identity.altegioClientId || identity.easyweekCustomerId) return true;
  if (!identity.nameKey) return false;
  return isE164(identity.phone) || isPlausibleEmail(identity.email);
}

// ---- name per source ---------------------------------------------------------------

type EasyweekCustomerLike = {
  uuid?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  email?: string | null;
} | null | undefined;

type AltegioClientLike = {
  id?: string | number | null;
  externalId?: string | null;
  name?: string | null;
  surname?: string | null;
  displayName?: string | null;
  display_name?: string | null;
} | null | undefined;

type AccountLike = {
  name?: string | null;
  secondName?: string | null;
} | null | undefined;

const trimOrNull = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

export function nameFromEasyweekCustomer(customer: EasyweekCustomerLike): ClientName {
  if (!customer) return EMPTY_NAME;
  const firstName = cut(trimOrNull(customer.firstName), CLIENT_COLUMN_LIMITS.firstName);
  const lastName = cut(trimOrNull(customer.lastName), CLIENT_COLUMN_LIMITS.lastName);
  return { firstName, lastName, displayName: cleanName(firstName, lastName) };
}

export function nameFromAltegioClient(client: AltegioClientLike): ClientName {
  if (!client) return EMPTY_NAME;
  const firstName = cut(trimOrNull(client.name), CLIENT_COLUMN_LIMITS.firstName);
  const lastName = cut(trimOrNull(client.surname), CLIENT_COLUMN_LIMITS.lastName);
  const displayName = trimOrNull(client.displayName ?? client.display_name) ?? cleanName(firstName, lastName);
  return { firstName, lastName, displayName };
}

export function nameFromAccount(account: AccountLike): ClientName {
  if (!account) return EMPTY_NAME;
  const firstName = cut(trimOrNull(account.name), CLIENT_COLUMN_LIMITS.firstName);
  const lastName = cut(trimOrNull(account.secondName), CLIENT_COLUMN_LIMITS.lastName);
  return { firstName, lastName, displayName: cleanName(firstName, lastName) };
}

export function altegioClientExternalId(client: AltegioClientLike): string | null {
  if (!client) return null;
  const raw = client.externalId ? String(client.externalId) : client.id != null && client.id !== '' ? String(client.id) : null;
  return dropIfLonger(raw, CLIENT_COLUMN_LIMITS.externalId);
}

/**
 * EasyWeek's `customer` as it sits in the untouched payload (snake_case), the shape
 * `bookings.crm_payload` stores. The uuid is never persisted to a column, so this is
 * how the back-fill and the self-heal path recover it.
 */
export function readEasyweekCustomer(payload: unknown): Exclude<EasyweekCustomerLike, null | undefined> | null {
  const customer = (payload as any)?.customer;
  if (!customer || typeof customer !== 'object') return null;
  return {
    uuid: customer.uuid ?? null,
    firstName: customer.first_name ?? customer.firstName ?? null,
    lastName: customer.last_name ?? customer.lastName ?? null,
    phone: customer.phone ?? null,
    email: customer.email ?? null,
  };
}

// ---- builders ---------------------------------------------------------------------

/**
 * From what the booking handler already has in memory. The name comes from the same
 * source the snapshot did (`snapshot.clientSource`), so name and contact always
 * describe the same record; the CRM ids are taken whenever the CRM sent them.
 */
export function identityFromSources(args: {
  salonId: string;
  userId: string | null | undefined;
  snapshot: ClientSnapshot;
  easyweekCustomer?: EasyweekCustomerLike;
  altegioClient?: AltegioClientLike;
  account?: AccountLike;
  bookingDatetime: Date;
}): ClientIdentity {
  let name: ClientName;
  switch (args.snapshot.clientSource) {
    case 'easyweek':
      name = nameFromEasyweekCustomer(args.easyweekCustomer);
      break;
    case 'altegio':
      name = nameFromAltegioClient(args.altegioClient);
      break;
    case 'user':
      name = nameFromAccount(args.account);
      break;
    default:
      name = EMPTY_NAME;
  }
  return {
    salonId: args.salonId,
    userId: args.userId ?? null,
    altegioClientId: altegioClientExternalId(args.altegioClient),
    easyweekCustomerId: dropIfLonger(trimOrNull(args.easyweekCustomer?.uuid), CLIENT_COLUMN_LIMITS.externalId),
    name,
    nameKey: buildNameKey(name),
    phone: dropIfLonger(args.snapshot.clientPhone ?? null, CLIENT_COLUMN_LIMITS.phone),
    email: dropIfLonger(normalizeEmail(args.snapshot.clientEmail), CLIENT_COLUMN_LIMITS.email),
    bookingDatetime: args.bookingDatetime,
  };
}

export type BookingRowForIdentity = {
  salonId: string;
  userId: string | null;
  datetime: Date;
  crmType: string | null;
  crmPayload: unknown;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientSource: string | null;
  altegioDetails?: { client?: AltegioClientLike } | null;
};

/**
 * From a stored booking row — the back-fill and the self-heal path. Rebuilds the
 * same structured name the handler saw: EasyWeek from the raw payload's customer,
 * Altegio from the persisted `altegio_booking_client`, the account from `users`
 * (the caller loads it; `Booking.userId` has no Prisma relation to follow).
 */
export function identityFromBookingRow(row: BookingRowForIdentity, account?: AccountLike): ClientIdentity {
  const snapshot = clientFromRow(row);
  const easyweekCustomer = row.crmType === CrmType.EASYWEEK ? readEasyweekCustomer(row.crmPayload) : null;
  const altegioClient = row.crmType === CrmType.ALTEGIO ? row.altegioDetails?.client ?? null : null;
  return identityFromSources({
    salonId: row.salonId,
    userId: row.userId,
    snapshot,
    easyweekCustomer,
    altegioClient,
    account,
    bookingDatetime: row.datetime,
  });
}
