import { CategoryCreateInput, CategoryUpdateInput } from '../types';
import { CategoryData, Page } from '../dtos';
import { AltegioContext } from './context';

export async function pullCategories(ctx: AltegioContext): Promise<Page<CategoryData>> {
  const externalSalonId = ctx.requireExternalSalonId();
  const items = await ctx.http<any[]>('GET', `/api/v1/company/${externalSalonId}/service_categories`);
  const mapped: CategoryData[] = (items || []).map((x: any) => ({
    externalId: String(x.id),
    name: x.title,
    sortOrder: typeof x.weight === 'number' ? Number(x.weight) : null,
    isActive: true,
  }));
  return { items: mapped, fetched: mapped.length };
}

export async function createCategory(ctx: AltegioContext, data: CategoryCreateInput): Promise<CategoryData> {
  const externalSalonId = ctx.requireExternalSalonId();
  const body: any = { title: data.title };
  if (data.weight !== undefined && data.weight !== null) body.weight = data.weight;
  const res = await ctx.http<any>('POST', `/api/v1/service_categories/${externalSalonId}`, { body });
  const externalId = String(res?.id ?? res?.data?.id ?? res);
  return { externalId, name: data.title, sortOrder: data.weight ?? null, color: null, isActive: true };
}

export async function updateCategory(ctx: AltegioContext, externalId: string, patch: CategoryUpdateInput): Promise<CategoryData> {
  const externalSalonId = ctx.requireExternalSalonId();
  const body: any = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.weight !== undefined) body.weight = patch.weight;
  if (patch.staff !== undefined) body.staff = patch.staff;
  await ctx.http('PUT', `/api/v1/service_category/${externalSalonId}/${externalId}`, { body });
  return { externalId: String(externalId), name: patch.title ?? '', sortOrder: patch.weight ?? null, color: null, isActive: true };
}

export async function deleteCategory(ctx: AltegioContext, externalId: string): Promise<void> {
  const externalSalonId = ctx.requireExternalSalonId();
  await ctx.http('DELETE', `/api/v1/service_category/${externalSalonId}/${externalId}`);
}


