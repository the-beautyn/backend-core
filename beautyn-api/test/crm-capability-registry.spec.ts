import * as fs from 'node:fs';
import * as path from 'node:path';
import { CapabilityRegistryService } from '@crm/capability-registry';
import { CrmType } from '@crm/shared';

describe('CapabilityRegistryService', () => {
  const fixturesDir = path.resolve(__dirname, 'fixtures');
  const overridePath = path.join(fixturesDir, 'caps.override.json');

  beforeAll(() => {
    if (!fs.existsSync(fixturesDir)) fs.mkdirSync(fixturesDir);
    fs.writeFileSync(
      overridePath,
      JSON.stringify({
        ALTEGIO: { batchSize: 42, supportsReschedule: false },
        NEWPROVIDER: {
          webhooks: true,
          batchSize: 10,
          supportsBooking: false,
          supportsReschedule: false,
          supportsSalonSync: false,
          supportsServicesSync: false,
          supportsWorkersSync: false,
        },
      }),
      'utf8',
    );
  });

  afterAll(() => {
    try {
      fs.unlinkSync(overridePath);
    } catch {}
    try {
      fs.rmdirSync(fixturesDir);
    } catch {}
    delete process.env.CRM_CAPS_PATH;
  });

  it('loads defaults and returns typed capability', () => {
    delete process.env.CRM_CAPS_PATH;
    const reg = new CapabilityRegistryService();
    const cap = reg.get(CrmType.ALTEGIO);
    expect(cap.supportsBooking).toBe(true);
    expect(typeof cap.batchSize).toBe('number');
  });

  it('deep-merges overrides from CRM_CAPS_PATH', () => {
    process.env.CRM_CAPS_PATH = overridePath;
    const reg = new CapabilityRegistryService();
    const cap = reg.get(CrmType.ALTEGIO);
    expect(cap.batchSize).toBe(42);
    expect(cap.supportsReschedule).toBe(false);
  });

  it('assert() throws for unsupported capability', () => {
    const reg = new CapabilityRegistryService();
    expect(() => reg.assert(CrmType.EASYWEEK, 'supportsReschedule')).toThrow();
  });

  it('list() returns known providers (including new ones from override)', () => {
    process.env.CRM_CAPS_PATH = overridePath;
    const reg = new CapabilityRegistryService();
    const list = reg.list();
    expect(list).toContain('ALTEGIO');
    expect(list).toContain('EASYWEEK');
    expect(list).toContain('NEWPROVIDER' as any);
  });
});

