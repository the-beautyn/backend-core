import { EasyWeekContext } from './context';
import { SalonData } from '../dtos';

export async function pullSalon(ctx: EasyWeekContext): Promise<SalonData> {
  const loc = await ctx.findLocationById();
  if (!loc) throw new Error('EasyWeek location not found');
  let workspace: any | null = null;
  try {
    workspace = await ctx.doFetch(`${ctx.base}/workspace`, { method: 'GET' });
  } catch (err) {
    ctx.log?.warn?.('EasyWeek workspace fetch failed', { err });
  }
  return ctx.mapSalon(loc, workspace ?? undefined);
}

