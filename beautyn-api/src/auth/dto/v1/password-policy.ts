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
 * Require at least one lowercase letter, one uppercase letter, and one
 * digit. Special characters are still permitted via PASSWORD_CHARSET but
 * not required — dropping that requirement reduces friction at signup
 * without materially weakening the policy for 8+ char mixed-case+digit
 * passwords.
 */
export const PASSWORD_COMPOSITION = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
