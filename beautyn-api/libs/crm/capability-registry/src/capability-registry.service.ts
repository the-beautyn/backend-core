import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, BadRequestException } from '@nestjs/common';
import { Capability, CapabilityMap } from './types';
import { CrmType } from '@crm/shared';

function isRecord(x: unknown): x is Record<string, any> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

/** Small deep-merge for plain objects */
function deepMerge<T extends Record<string, any>>(a: T, b: Partial<T>): T {
  const out: any = { ...a };
  for (const [k, v] of Object.entries(b)) {
    if (isRecord(v) && isRecord(out[k])) out[k] = deepMerge(out[k], v);
    else out[k] = v;
  }
  return out;
}

function loadJson(filePath: string): any | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function loadDefaultMapWithCandidates(): CapabilityMap {
  const candidates = [
    // Dist path (built runtime)
    path.resolve(__dirname, 'capabilities.defaults.json'),
    // Source path (ts-node / dev runtime)
    path.resolve(process.cwd(), 'libs/crm/capability-registry/src/capabilities.defaults.json'),
  ];
  for (const p of candidates) {
    const json = loadJson(p);
    if (json && typeof json === 'object') {
      return json as CapabilityMap;
    }
  }
  return {} as CapabilityMap;
}

function loadOverride(filePath?: string): Partial<CapabilityMap> | null {
  if (!filePath) return null;
  try {
    const p = path.resolve(filePath);
    const obj = loadJson(p);
    if (!isRecord(obj)) return null;
    return obj as Partial<CapabilityMap>;
  } catch {
    return null;
  }
}

@Injectable()
export class CapabilityRegistryService {
  private readonly caps: CapabilityMap;

  constructor() {
    const defaults = loadDefaultMapWithCandidates();
    const overridePath = process.env.CRM_CAPS_PATH;
    const overrides = loadOverride(overridePath) ?? {};
    // merge top-level providers
    const merged: any = { ...defaults };
    for (const key of Object.keys(overrides)) {
      const base = (defaults as any)[key];
      const override = (overrides as any)[key];
      merged[key] = base ? deepMerge(base, override) : override;
    }
    this.caps = merged;
  }

  /** Return typed capability object for a provider */
  get(provider: CrmType): Capability {
    const found = this.caps[provider];
    if (!found) {
      throw new BadRequestException({ message: 'Unknown CRM provider', code: 'UNKNOWN_PROVIDER', provider });
    }
    return found;
  }

  /** True if provider supports this capability key */
  has<K extends keyof Capability>(provider: CrmType, key: K): boolean {
    return !!this.get(provider)[key];
  }

  /** Throws if the capability key is falsey for the provider */
  assert<K extends keyof Capability>(provider: CrmType, key: K): void {
    const ok = this.has(provider, key);
    if (!ok) {
      throw new BadRequestException({
        message: 'Operation is not supported for this provider',
        code: 'CAPABILITY_NOT_SUPPORTED',
        provider,
        capability: String(key),
      });
    }
  }

  /** List all providers present in the registry */
  list(): CrmType[] {
    return Object.keys(this.caps) as CrmType[];
  }
}

