import { createHmac, timingSafeEqual } from 'crypto';

export function verifyHmacHex(input: { secret: string; raw: string; signatureHex: string }): boolean {
  const { secret, raw, signatureHex } = input;
  const hmac = createHmac('sha256', secret).update(raw).digest('hex');
  const hmacBuf = Buffer.from(hmac, 'hex');
  const sigBuf = Buffer.from(signatureHex, 'hex');
  if (hmacBuf.length !== sigBuf.length) {
    return false;
  }
  try {
    return timingSafeEqual(hmacBuf, sigBuf);
  } catch {
    return false;
  }
}
