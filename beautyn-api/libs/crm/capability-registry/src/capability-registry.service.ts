import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable } from '@nestjs/common';
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

function loadDefaultMap(): CapabilityMap {
  // Load defaults.json relative to this source directory to work in tests and builds
  const defaultsPath = path.resolve(__dirname, 'capabilities.defaults.json');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const json = loadJson(defaultsPath) ?? {};
  return json as CapabilityMap;
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
    const defaults = loadDefaultMap();
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
      throw new Error(`Unknown provider: ${provider}`);
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
      throw new Error(`Capability ${String(key)} is not supported by ${provider}`);
    }
  }

  /** List all providers present in the registry */
  list(): CrmType[] {
    return Object.keys(this.caps) as CrmType[];
  }
}

