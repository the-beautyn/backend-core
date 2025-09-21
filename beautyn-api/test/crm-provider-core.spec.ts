import { ProviderFactory } from '@crm/provider-core';
import { CrmType, CrmError, ErrorKind } from '@crm/shared';

// Light stubs for dependencies to satisfy constructor signatures
class CapsStub { get() { return {}; } }
class TokensStub {
  async get(_salonId?: string, provider?: CrmType) {
    if (provider === CrmType.ALTEGIO) return { accessToken: 'b', userToken: 'u' } as any;
    if (provider === CrmType.EASYWEEK) return { apiKey: 'X' } as any;
    return {} as any;
  }
}
class AccountsStub {
  async get(salonId: string, provider: CrmType) {
    if (provider === CrmType.ALTEGIO) return { data: { externalSalonId: 123 }, salonId, provider, createdAt: new Date(), updatedAt: new Date() } as any;
    if (provider === CrmType.EASYWEEK) return { data: { workspaceSlug: 'slug', locationId: '00000000-0000-0000-0000-000000000000' }, salonId, provider, createdAt: new Date(), updatedAt: new Date() } as any;
    return null as any;
  }
}

describe('ProviderFactory', () => {
  const factory = new ProviderFactory(new CapsStub() as any, new TokensStub() as any, new AccountsStub() as any);

  it('returns Altegio provider for ALTEGIO', () => {
    const p = factory.make(CrmType.ALTEGIO);
    expect(p).toBeTruthy();
    expect(typeof p.init).toBe('function');
  });

  it('returns EasyWeek provider for EASYWEEK', () => {
    const p = factory.make(CrmType.EASYWEEK);
    expect(p).toBeTruthy();
  });
});

// createBooking/reschedule/cancel are currently commented in provider stubs; skip until implemented
describe.skip('Provider stubs throw Not implemented', () => {
  const factory = new ProviderFactory(new CapsStub() as any, new TokensStub() as any, new AccountsStub() as any);
  const ctx = { salonId: '11111111-1111-1111-1111-111111111111', provider: CrmType.ALTEGIO } as const;

  it('createBooking throws CrmError(INTERNAL)', async () => {
    process.env.ALTEGIO_BEARER = 'b';
    process.env.ALTEGIO_USER = 'u';
    const p = factory.make(CrmType.ALTEGIO);
    await p.init(ctx);
    await expect(p.createBooking(ctx, { startAtIso: new Date().toISOString() } as any)).rejects.toThrow(CrmError);
  });
});

