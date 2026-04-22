import { normalizePhone } from '../../src/shared/validators/normalize-phone';

describe('normalizePhone', () => {
  it('returns E.164 form for already-canonical input', () => {
    expect(normalizePhone('+380501234567')).toBe('+380501234567');
  });

  it('strips spaces, dashes, and parentheses from formatted input', () => {
    expect(normalizePhone('+380 50 123 45 67')).toBe('+380501234567');
    expect(normalizePhone('+380-50-123-45-67')).toBe('+380501234567');
    expect(normalizePhone('+38(050)123-45-67')).toBe('+380501234567');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizePhone('  +380501234567  ')).toBe('+380501234567');
  });

  it('returns the trimmed original when the number is invalid or unparseable', () => {
    // Validator downstream is responsible for rejecting — we must not throw here.
    expect(normalizePhone('not-a-phone')).toBe('not-a-phone');
    expect(normalizePhone('+1')).toBe('+1');
  });

  it('passes non-string input through untouched', () => {
    expect(normalizePhone(undefined)).toBeUndefined();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone(12345)).toBe(12345);
  });

  it('handles US numbers', () => {
    expect(normalizePhone('+1 (212) 555-1234')).toBe('+12125551234');
  });
});
