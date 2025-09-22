/** CRM provider type. */
export enum CrmType {
  ALTEGIO = 'ALTEGIO',
  EASYWEEK = 'EASYWEEK',
}

/** High level error categories for CRM interactions. */
export enum ErrorKind {
  RATE_LIMIT = 'RATE_LIMIT',
  AUTH = 'AUTH',
  NETWORK = 'NETWORK',
  VALIDATION = 'VALIDATION',
  NOT_SUPPORTED = 'NOT_SUPPORTED',
  INTERNAL = 'INTERNAL',
}

/**
 * Authentication tokens issued by CRM providers.
 * `expiresAt` is an ISO 8601 timestamp string.
 */
export type TokenBundle = {
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  /** Secondary token for dual‑header flows (e.g., Altegio `User` header). */
  userToken?: string;
  expiresAt?: string; // ISO 8601
};

/** Identifies a CRM provider within a salon. */
export type ProviderId = {
  salonId: string;
  provider: CrmType;
};
