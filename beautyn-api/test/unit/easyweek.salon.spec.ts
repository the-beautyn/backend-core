import { pullSalon } from '../../libs/crm/provider-core/src/easyweek/salon';

describe('EasyWeek pullSalon', () => {
  it('fetches workspace and passes it to mapSalon', async () => {
    const loc = { uuid: 'loc-1' };
    const workspace = { country_iso: 'Ukraine', contacts: { phone: '+380' } };
    const ctx: any = {
      base: 'https://my.easyweek.io/api/public/v2',
      findLocationById: jest.fn().mockResolvedValue(loc),
      doFetch: jest.fn().mockResolvedValue(workspace),
      mapSalon: jest.fn().mockReturnValue({ externalId: 'loc-1', name: 'Salon' }),
      log: { warn: jest.fn() },
    };

    const res = await pullSalon(ctx);

    expect(ctx.doFetch).toHaveBeenCalledWith(`${ctx.base}/workspace`, { method: 'GET' });
    expect(ctx.mapSalon).toHaveBeenCalledWith(loc, workspace);
    expect(res).toEqual({ externalId: 'loc-1', name: 'Salon' });
  });

  it('continues when workspace fetch fails', async () => {
    const loc = { uuid: 'loc-1' };
    const ctx: any = {
      base: 'https://my.easyweek.io/api/public/v2',
      findLocationById: jest.fn().mockResolvedValue(loc),
      doFetch: jest.fn().mockRejectedValue(new Error('network')),
      mapSalon: jest.fn().mockReturnValue({ externalId: 'loc-1', name: 'Salon' }),
      log: { warn: jest.fn() },
    };

    const res = await pullSalon(ctx);

    expect(ctx.mapSalon).toHaveBeenCalledWith(loc, undefined);
    expect(ctx.log.warn).toHaveBeenCalled();
    expect(res).toEqual({ externalId: 'loc-1', name: 'Salon' });
  });
});
