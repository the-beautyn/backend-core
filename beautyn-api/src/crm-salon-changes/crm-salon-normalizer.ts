import { createHash } from 'crypto';

export type CanonicalValue =
  | null
  | string
  | number
  | boolean
  | CanonicalValue[]
  | { [key: string]: CanonicalValue };

type Path = readonly string[];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isGeoCoordinate(path: Path): boolean {
  if (!path.length) return false;
  const last = path[path.length - 1];
  return last === 'lat' || last === 'lon' || last === 'latitude' || last === 'longitude';
}

function round(value: number, precision = 6): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

function stableStringify(value: CanonicalValue): string {
  if (value === null) return 'null';
  const t = typeof value;
  if (t === 'string') return JSON.stringify(value);
  if (t === 'number') {
    if (Number.isFinite(value)) return value.toString();
    return JSON.stringify(value);
  }
  if (t === 'boolean') return value ? 'true' : 'false';
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const entries = Object.entries(value as Record<string, CanonicalValue>);
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

function canonicalizeInternal(input: unknown, path: Path): CanonicalValue {
  if (input == null) return null;

  if (Array.isArray(input)) {
    const items = input.map((item) => canonicalizeInternal(item, path));
    const unique = new Map<string, CanonicalValue>();
    for (const item of items) {
      const key = stableStringify(item);
      if (!unique.has(key)) unique.set(key, item);
    }
    return Array.from(unique.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([, v]) => v);
  }

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (isGeoCoordinate(path)) {
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) return null;
      return round(parsed, 6);
    }
    return trimmed;
  }

  if (typeof input === 'number') {
    if (!Number.isFinite(input)) return input;
    if (isGeoCoordinate(path)) {
      return round(input, 6);
    }
    return input;
  }

  if (typeof input === 'boolean') return input;

  if (isPlainObject(input)) {
    const entries = Object.entries(input as Record<string, unknown>)
      .map(([key, value]) => [key, canonicalizeInternal(value, [...path, key])] as const)
      .filter(([, value]) => value !== null);
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    const out: Record<string, CanonicalValue> = {};
    for (const [key, value] of entries) {
      out[key] = value;
    }
    return out;
  }

  if (typeof input === 'bigint') {
    return Number(input);
  }

  return (input as unknown) as CanonicalValue;
}

export function canonicalize(value: unknown, path: Path = []): CanonicalValue {
  return canonicalizeInternal(value, path);
}

export function canonicalStringify(value: unknown, path: Path = []): string {
  return stableStringify(canonicalizeInternal(value, path));
}

export function canonicalHash(value: unknown, path: Path = []): string {
  const normalized = canonicalStringify(value, path);
  return createHash('sha256').update(normalized).digest('hex');
}

export function equalCanonical(a: unknown, b: unknown, path: Path = []): boolean {
  if (a === b) return true;
  return canonicalStringify(a, path) === canonicalStringify(b, path);
}

