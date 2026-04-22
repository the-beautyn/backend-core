// Shared password policy for register and reset-password. These constants
// MUST be the only source of truth — if one DTO drifts, a user could pick
// a password at registration that later fails the reset-password validator
// (or vice versa).

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 50;

/**
 * Allowed charset: printable ASCII 0x21–0x7E. Intentionally excludes space
 * (0x20) — spaces are easy to typo and rarely wanted in passwords.
 */
export const PASSWORD_CHARSET = /^[\x21-\x7E]+$/;

/**
 * Require at least one lowercase letter, one uppercase letter, one digit,
 * and one special character. Special-char range = printable ASCII minus
 * letters, digits, and space:
 *   0x21–0x2F  !"#$%&'()*+,-./
 *   0x3A–0x40  :;<=>?@
 *   0x5B–0x60  [\]^_`
 *   0x7B–0x7E  {|}~
 */
export const PASSWORD_COMPOSITION =
  /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\x21-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E])/;
