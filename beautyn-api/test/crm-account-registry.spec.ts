import { AccountRegistryService } from '@crm/account-registry';
import { AccountRegistryRepository } from '@crm/account-registry';
import { CrmType } from '@crm/shared';

class MemRepo implements AccountRegistryRepository {
  private map = new Map<string, any>();
  private key(s: string, p: string) { return `${s}|${p}`; }
  async find(salonId: string, provider: CrmType) { return this.map.get(this.key(salonId, provider)) ?? null; }
  async upsert(payload: any) { this.map.set(this.key(payload.salonId, payload.provider), { ...payload }); }
}

describe('AccountRegistryService', () => {
  const svc = new AccountRegistryService(new MemRepo());

  it('stores and reads Altegio externalSalonId', async () => {
    const salonId = '11111111-1111-1111-1111-111111111111';
    await svc.setAltegio(salonId, { externalSalonId: 123 });
    const got = await svc.get(salonId, CrmType.ALTEGIO);
    expect(got?.data).toEqual({ externalSalonId: 123 });
  });

  it('stores and reads EasyWeek workspace + location', async () => {
    const salonId = '22222222-2222-2222-2222-222222222222';
    await svc.setEasyWeek(salonId, { workspaceSlug: 'beautyn-kyiv', locationId: '4b2b0a0a-5b8a-4b3d-9a2e-4f4b9a2e7f11' });
    const got = await svc.get(salonId, CrmType.EASYWEEK);
    expect(got?.data).toEqual({ workspaceSlug: 'beautyn-kyiv', locationId: '4b2b0a0a-5b8a-4b3d-9a2e-4f4b9a2e7f11' });
  });
});

