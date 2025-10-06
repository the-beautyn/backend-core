import { EasyWeekContext } from './context';
import { CategoryData, Page } from '../dtos';

export async function pullCategories(ctx: EasyWeekContext): Promise<Page<CategoryData>> {
  const locationId = ctx.require(ctx.locationId, 'locationId');
  const raw = await ctx.doFetch(`${ctx.base}/locations/${encodeURIComponent(locationId)}/service-categories`);
  const data = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
  const items: CategoryData[] = (data as any[])
    .map((c: any) => {
      const externalId = c?.uuid ?? c?.id;
      if (!externalId) return null;
      const order = c?.order ?? c?.sort_order ?? undefined;
      return {
        externalId: String(externalId),
        name: String(c?.name ?? '').trim() || 'Category',
        sortOrder: typeof order === 'number' ? Number(order) : null,
        isActive: true
      } as CategoryData;
    })
    .filter((item): item is CategoryData => !!item);
  return { items, fetched: items.length };
}


