import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * The denormalised client columns on `bookings`, and the rules for filling them.
 *
 * Deliberately a standalone pure module rather than private methods on the
 * handler: the sync path and the one-off back-fill script must produce byte-identical
 * snapshots for the same input, and the only way to guarantee that is to run the
 * same code. An earlier attempt expressed the back-fill as SQL in the migration and
 * it drifted twice — SQL cannot replicate libphonenumber's validity check, so
 * `380950000001` and `123456` need opposite treatment and no regex distinguishes them.
 */
export type ClientSnapshot = {
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientSource: 'easyweek' | 'altegio' | 'user' | null;
};

export const EMPTY_CLIENT: ClientSnapshot = {
  clientName: null,
  clientPhone: null,
  clientEmail: null,
  clientSource: null,
};

/** Mirrors `client_phone VARCHAR(30)` in schema.prisma. */
export const MAX_CLIENT_PHONE_LENGTH = 30;

/**
 * Best-effort E.164. Altegio sends bare digits ("380950000001") and EasyWeek already
 * sends E.164, so the only work is supplying the `+` libphonenumber needs to infer a
 * country — there is no sensible default country to pass it.
 *
 * Parsed here rather than through `shared/validators/normalize-phone`, which is shaped
 * for `@Transform`: it returns `unknown` and echoes its input back on failure, so a
 * caller cannot tell success from failure.
 *
 * An unparseable value keeps the CRM's own string — a malformed number is more use to
 * an owner than an empty cell — but only up to the column width. CRM phone fields
 * sometimes hold free text ("call after 5pm, ask for John"), and a longer value would
 * fail the INSERT and take the booking write, and on a sync run the job, with it.
 */
export function toE164(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^\d{6,}$/.test(trimmed) ? `+${trimmed}` : trimmed;
  const parsed = parsePhoneNumberFromString(candidate);
  if (parsed?.isValid()) return parsed.number;
  return trimmed.length <= MAX_CLIENT_PHONE_LENGTH ? trimmed : null;
}

export function cleanName(
  ...parts: Array<string | null | undefined>
): string | null {
  const joined = parts.filter(Boolean).join(' ').trim();
  return joined || null;
}

/**
 * Lower-cased, trimmed email, or null. Used for the `salon_clients.email` column and
 * its match key only — the booking snapshot keeps the CRM's original casing so the
 * BEA-68 change detection and back-fill stay byte-identical.
 */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed || null;
}

/** A snapshot is only worth a provenance if it actually carries something. */
export function hasAnyClientField(snapshot: ClientSnapshot): boolean {
  return Boolean(
    snapshot.clientName || snapshot.clientPhone || snapshot.clientEmail,
  );
}

export function clientFromEasyweekCustomer(
  customer: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null,
): ClientSnapshot {
  if (!customer) return EMPTY_CLIENT;
  return {
    clientName: cleanName(customer.firstName, customer.lastName),
    clientPhone: toE164(customer.phone),
    clientEmail: customer.email?.trim() || null,
    clientSource: 'easyweek',
  };
}

export function clientFromAltegioClient(client: any): ClientSnapshot {
  if (!client) return EMPTY_CLIENT;
  return {
    clientName:
      client.displayName?.trim() || cleanName(client.name, client.surname),
    clientPhone: toE164(client.phone),
    clientEmail: client.email?.trim() || null,
    clientSource: 'altegio',
  };
}

export function clientFromAccount(
  user: {
    name?: string | null;
    secondName?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null,
): ClientSnapshot {
  if (!user) return EMPTY_CLIENT;
  return {
    clientName: cleanName(user.name, user.secondName),
    clientPhone: toE164(user.phone),
    clientEmail: user.email?.trim() || null,
    clientSource: 'user',
  };
}

/**
 * What the CRM said, falling back to the account that booked when the CRM told us
 * nothing. Returns the empty snapshot — including a null source — rather than
 * stamping a provenance on a row with no data behind it.
 */
export function resolveClientSnapshot(
  fromCrm: ClientSnapshot,
  account: Parameters<typeof clientFromAccount>[0],
): ClientSnapshot {
  if (hasAnyClientField(fromCrm)) return fromCrm;
  const fromAccount = clientFromAccount(account);
  return hasAnyClientField(fromAccount) ? fromAccount : EMPTY_CLIENT;
}

/** The stored columns, shaped like a snapshot so change detection stays symmetric. */
export function clientFromRow(row: any): ClientSnapshot {
  return {
    clientName: row?.clientName ?? null,
    clientPhone: row?.clientPhone ?? null,
    clientEmail: row?.clientEmail ?? null,
    clientSource: row?.clientSource ?? null,
  };
}
