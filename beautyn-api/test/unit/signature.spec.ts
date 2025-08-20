import { createHmac } from 'crypto';
import { verifyHmacHex } from '../../src/crm-integration/crypto/signature';

describe('verifyHmacHex', () => {
  const secret = 'secret';
  const raw = 'data';
  const good = createHmac('sha256', secret).update(raw).digest('hex');

  it('returns true for valid signature', () => {
    expect(verifyHmacHex({ secret, raw, signatureHex: good })).toBe(true);
  });

  it('returns false for invalid signature', () => {
    expect(verifyHmacHex({ secret, raw, signatureHex: 'bad' })).toBe(false);
  });
});
