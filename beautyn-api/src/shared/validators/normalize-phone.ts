import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Normalizes a phone-number-like input to E.164 form (e.g. "+380501234567").
 * If the input is not a parseable/valid phone number, it is returned untouched
 * so downstream validators can surface a clear rejection.
 *
 * Designed for use inside a class-transformer `@Transform` on DTO fields,
 * where the follow-up validator (`@IsValidPhone`, `@Matches`, etc.) still runs.
 */
export function normalizePhone(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const parsed = parsePhoneNumberFromString(trimmed);
  if (!parsed || !parsed.isValid()) return trimmed;

  return parsed.number;
}
