import { EasyWeekContext } from './context';
import { SalonData } from '../dtos';

export async function pullSalon(ctx: EasyWeekContext): Promise<SalonData> {
  const loc = await ctx.findLocationById();
  if (!loc) throw new Error('EasyWeek location not found');
  return ctx.mapSalon(loc);
}


