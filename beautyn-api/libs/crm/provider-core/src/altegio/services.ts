import { ServiceCreateInput, ServiceUpdateInput } from '../types';
import { Page, ServiceData } from '../dtos';
import { AltegioContext } from './context';

export async function pullServices(ctx: AltegioContext): Promise<Page<ServiceData>> {
  const externalSalonId = ctx.requireExternalSalonId();
  const items = await ctx.http<any[]>('GET', `/api/v1/company/${externalSalonId}/services`);
  const mapped: ServiceData[] = (items || []).map((s: any) => ({
    externalId: String(s.id),
    name: s.title,
    duration: s.duration ?? 0,
    price: s.price_min ?? 0,
    currency: s.currency ?? 'UAH',
    categoryExternalId: String(s.category_id ?? ''),
    description: undefined,
    isActive: typeof s.active === 'number' ? s.active === 1 : undefined,
    sortOrder: s.weight ?? undefined,
    workerExternalIds: s.staff?.map((w: any) => String(w.id)) ?? undefined,
  }));
  return { items: mapped, fetched: mapped.length };
}

export async function createService(ctx: AltegioContext, data: ServiceCreateInput): Promise<ServiceData> {
  const externalSalonId = ctx.requireExternalSalonId();
  const staff = Array.isArray(data.workerExternalIds) && data.workerExternalIds.length
    ? data.workerExternalIds.map((id) => ({ id: Number(id), seance_length: typeof data.duration === 'number' ? data.duration : undefined }))
    : undefined;
  const body: any = {
    title: data.name,
    category_id: data.categoryExternalId !== undefined && data.categoryExternalId !== null ? Number(data.categoryExternalId) : undefined,
    price_min: typeof data.price === 'number' ? data.price : undefined,
    price_max: typeof data.price === 'number' ? data.price : undefined,
    duration: typeof data.duration === 'number' ? data.duration : undefined,
    discount: 0,
    comment: data.description ?? '',
    weight: data.sortOrder ?? undefined,
    active: data.isActive === undefined ? 1 : (data.isActive ? 1 : 0),
  };
  if (staff) body.staff = staff;
  const res = await ctx.http<any>('POST', `/api/v1/services/${externalSalonId}`, { body });
  const externalId = String(res?.id ?? res?.data?.id ?? res);
  return {
    externalId,
    name: data.name,
    duration: data.duration ?? 0,
    price: data.price ?? 0,
    currency: data.currency ?? 'UAH',
    categoryExternalId: data.categoryExternalId ?? undefined,
    description: data.description ?? undefined,
    isActive: data.isActive ?? true,
    sortOrder: data.sortOrder ?? undefined,
    workerExternalIds: data.workerExternalIds ?? undefined,
  };
}

export async function updateService(ctx: AltegioContext, externalId: string, patch: ServiceUpdateInput): Promise<ServiceData> {
  const externalSalonId = ctx.requireExternalSalonId();
  let categoryIdNum: number | undefined;
  if (patch.categoryExternalId !== undefined && patch.categoryExternalId !== null) {
    categoryIdNum = Number(patch.categoryExternalId);
  } else {
    const items = await ctx.http<any[]>('GET', `/api/v1/company/${externalSalonId}/services`);
    const current = (items || []).find((s: any) => String(s?.id) === String(externalId));
    if (current?.category_id !== undefined && current?.category_id !== null) {
      categoryIdNum = Number(current.category_id);
    }
  }
  if (categoryIdNum === undefined || Number.isNaN(categoryIdNum)) {
    throw new Error('Altegio updateService requires category_id');
  }
  const staff = Array.isArray(patch.workerExternalIds) && patch.workerExternalIds.length
    ? patch.workerExternalIds.map((id) => ({ id: Number(id) }))
    : undefined;
  const body: any = { category_id: categoryIdNum };
  if (patch.name !== undefined) body.title = patch.name;
  if (patch.price !== undefined) { body.price_min = patch.price; body.price_max = patch.price; }
  if (patch.duration !== undefined) body.duration = patch.duration;
  if (patch.description !== undefined) body.comment = patch.description ?? '';
  if (patch.sortOrder !== undefined) body.weight = patch.sortOrder;
  if (patch.isActive !== undefined) body.active = patch.isActive ? 1 : 0;
  if (staff) body.staff = staff;
  await ctx.http('PUT', `/api/v1/services/${externalSalonId}/${externalId}`, { body });
  return {
    externalId: String(externalId),
    name: patch.name ?? '',
    duration: patch.duration ?? undefined,
    price: patch.price ?? undefined,
    currency: patch.currency ?? undefined,
    categoryExternalId: patch.categoryExternalId ?? undefined,
    description: patch.description ?? undefined,
    isActive: patch.isActive ?? undefined,
    sortOrder: patch.sortOrder ?? undefined,
    workerExternalIds: patch.workerExternalIds ?? undefined,
  } as ServiceData;
}

export async function deleteService(ctx: AltegioContext, externalId: string): Promise<void> {
  const externalSalonId = ctx.requireExternalSalonId();
  await ctx.http('DELETE', `/api/v1/services/${externalSalonId}/${externalId}`);
}


