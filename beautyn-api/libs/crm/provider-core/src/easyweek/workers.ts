import { WorkerData } from '../dtos';
import { EasyWeekContext } from './context';

export async function pullWorkers(ctx: EasyWeekContext): Promise<WorkerData[]> {
  const locationId = ctx.require(ctx.locationId, 'locationId');
  const url = `${ctx.base}/locations/${encodeURIComponent(locationId)}/staffers`;
  const rows = await ctx.fetchAll(url);
  return (rows || []).map(mapWorker);
}

function mapWorker(raw: any): WorkerData {
  const first = typeof raw?.first_name === 'string' ? raw.first_name.trim() : '';
  const last = typeof raw?.last_name === 'string' ? raw.last_name.trim() : '';
  const name = [first, last].filter(Boolean).join(' ') || (typeof raw?.name === 'string' ? raw.name : '');
  return {
    externalId: String(raw?.uuid ?? raw?.id ?? ''),
    name,
    firstName: first || undefined,
    lastName: last || undefined,
    position: raw?.position ?? raw?.role ?? undefined,
    description: raw?.description ?? undefined,
    email: raw?.email ?? undefined,
    phone: raw?.phone ?? undefined,
    photoUrl: raw?.avatar ?? raw?.photo ?? undefined,
    isActive: raw?.is_active ?? raw?.active ?? true,
    updatedAtIso: raw?.updated_at ?? raw?.updatedAt ?? undefined,
  };
}
