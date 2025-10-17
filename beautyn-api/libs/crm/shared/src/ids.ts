import { createHash } from 'node:crypto';

/** Generate a deterministic RFC4122 v5-like UUID from multiple string inputs. */
export function uuidV5FromStrings(...parts: Array<string | null | undefined>): string {
  const input = parts
    .filter((p): p is string => typeof p === 'string')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join('|');

  const hash = createHash('sha1').update(input, 'utf8').digest();
  // Take first 16 bytes
  const bytes = Buffer.from(hash.slice(0, 16));
  // Set version to 5
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  // Set variant to RFC 4122
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = bytes.toString('hex');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20)}`;
}


