import { TokenStorageService } from '@crm/token-storage';
import { TokenStorageRepository, CrmCredentialRow } from '@crm/token-storage';
import { CrmType, TokenBundle } from '@crm/shared';

class MemRepo implements TokenStorageRepository {
  private map = new Map<string, CrmCredentialRow>();
  private key(s: string, p: string) { return `${s}|${p}`; }
  async findUnique(salonId: string, provider: string) { return this.map.get(this.key(salonId, provider)) ?? null; }
  async upsert(data: Omit<CrmCredentialRow,'id'|'createdAt'|'updatedAt'>) {
    const now = new Date();
    const row: CrmCredentialRow = { id: 'mem', createdAt: now, updatedAt: now, ...data };
    this.map.set(this.key(data.salonId, data.provider), row);
  }
  async delete(salonId: string, provider: string) { this.map.delete(this.key(salonId, provider)); }
}

describe('TokenStorageService', () => {
  const salonId = '11111111-1111-1111-1111-111111111111';

  beforeAll(() => {
    process.env.NODE_CRM_MASTER_KEY = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; // 64 hex
  });

  it('round-trips EasyWeek secret (apiKey)', async () => {
    const repo = new MemRepo();
    const svc = new TokenStorageService(repo as any);
    const bundle: TokenBundle = { apiKey: 'EW_API_KEY' };
    await svc.store(salonId, CrmType.EASYWEEK, bundle);
    const got = await svc.get(salonId, CrmType.EASYWEEK);
    expect(got?.apiKey).toBe('EW_API_KEY');
  });

  it('delete removes credentials', async () => {
    const repo = new MemRepo();
    const svc = new TokenStorageService(repo as any);
    await svc.store(salonId, CrmType.EASYWEEK, { apiKey: 'x' });
    await svc.delete(salonId, CrmType.EASYWEEK);
    expect(await svc.get(salonId, CrmType.EASYWEEK)).toBeNull();
  });
});

