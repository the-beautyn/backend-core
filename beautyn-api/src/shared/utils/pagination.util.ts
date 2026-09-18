export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export interface PaginationOptions {
  defaultLimit?: number;
  maxLimit?: number;
}

const FALLBACK_DEFAULT_LIMIT = 20;
const FALLBACK_MAX_LIMIT = 100;

/**
 * Turn user-supplied `page`/`limit` into a safe `{ page, limit, skip }`.
 *
 * Inputs arrive from query strings, so they may be strings, absent, non-numeric,
 * fractional or negative; anything that is not a usable positive integer falls back
 * to the defaults rather than reaching Prisma as `NaN` (which would silently drop
 * `skip`/`take` and return the wrong page).
 *
 * Defaults and caps are per-caller because existing list endpoints disagree on them
 * — bookings and workers use 20/100, services 50/200 — so this deliberately does not
 * impose one answer.
 *
 * Note: four services (`workers`, `services`, `categories`, `app-categories`) still
 * carry their own private copies of this logic. They are intentionally untouched for
 * now; folding them in is a behaviour-preserving refactor that belongs in its own
 * change, since each would need its own defaults preserved exactly.
 */
export function normalizePagination(
  page?: number | string | null,
  limit?: number | string | null,
  options: PaginationOptions = {},
): PaginationParams {
  const defaultLimit = options.defaultLimit ?? FALLBACK_DEFAULT_LIMIT;
  const maxLimit = options.maxLimit ?? FALLBACK_MAX_LIMIT;

  const safePage = toPositiveInt(page) ?? 1;
  const safeLimit = Math.min(toPositiveInt(limit) ?? defaultLimit, maxLimit);

  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

function toPositiveInt(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === '') return null;
  // Floor before the range check, not after: a fraction below 1 is positive but
  // floors to 0, and returning that would hand Prisma `take: 0` — an always-empty
  // page — while looking like a valid value.
  const parsed = Math.floor(Number(value));
  if (!Number.isFinite(parsed) || parsed < 1) return null;
  return parsed;
}
