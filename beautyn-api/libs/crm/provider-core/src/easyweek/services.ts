import { EasyWeekContext } from './context';
import { Page, ServiceData } from '../dtos';

function toSeconds(raw: any): number {
  if (raw != null && typeof raw === 'object' && raw.value != null) {
    const value = Number(raw.value) || 0;
    const label = String(raw.label ?? '').toLowerCase();
    if (label === 'seconds') return value;
    if (label === 'minutes') return value * 60;
    if (label === 'hours') return value * 3600;
    return value;
  }
  return Number(raw ?? 0) || 0;
}

export async function pullServices(ctx: EasyWeekContext): Promise<Page<ServiceData>> {
  const locationId = ctx.require(ctx.locationId, 'locationId');
  const raw = await ctx.doFetch(`${ctx.base}/locations/${encodeURIComponent(locationId)}/services`);
  const data = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
  const items: ServiceData[] = (data as any[])
    .map((s: any) => {
      const externalId = s?.uuid ?? s?.id;
      if (!externalId) return null;
      const durationSeconds = toSeconds(s?.duration);
      return {
        externalId: String(externalId),
        name: String(s?.name ?? '').trim() || 'Service',
        description: s?.description ?? undefined,
        duration: durationSeconds,
        price: Number(s?.price ?? s?.price ?? 0) || 0,
        currency: String(s?.currency ?? 'UAH'),
        categoryExternalId: s?.category?.uuid ? String(s.category.uuid) : undefined,
        isActive: s?.is_active ?? true,
      } as ServiceData;
    })
    .filter((item): item is ServiceData => !!item);
  return { items, fetched: items.length };
}


