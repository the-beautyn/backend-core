import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { TokenBundle } from '@crm/shared';

export function loadMasterKey(): Buffer {
  const hex = process.env.NODE_MASTER_KEY?.trim();
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('NODE_MASTER_KEY must be 64 hex chars (32 bytes)');
  }
  return Buffer.from(hex, 'hex');
}

export type EncryptedPayload = {
  cipherText: Uint8Array;
  iv: Uint8Array;
  authTag: Uint8Array;
};

/** AES-256-GCM with AAD bound to (salonId:provider). */
export function encryptBundle(bundle: TokenBundle, salonId: string, provider: string): EncryptedPayload {
  const key = loadMasterKey();
  const iv = randomBytes(12);
  const aad = Buffer.from(`${salonId}:${provider}`);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  // Node 20+: setAAD options can include plaintextLength, but it's optional for our usage
  cipher.setAAD(aad);

  const plaintext = Buffer.from(JSON.stringify(bundle), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return { cipherText: encrypted, iv, authTag };
}

export function decryptBundle(payload: EncryptedPayload, salonId: string, provider: string): TokenBundle {
  const key = loadMasterKey();
  const iv = Buffer.from(payload.iv);
  const aad = Buffer.from(`${salonId}:${provider}`);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(Buffer.from(payload.authTag));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.cipherText)),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8')) as TokenBundle;
}

