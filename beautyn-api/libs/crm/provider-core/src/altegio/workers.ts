import { WorkerData } from '../dtos';
import { WorkerCreateInput, WorkerUpdateInput } from '../types';
import { CrmError, ErrorKind } from '@crm/shared';
import { AltegioContext } from './context';
import { splitName, buildFullName } from '@crm/shared';
import { Page } from '../dtos';

export async function pullWorkers(ctx: AltegioContext): Promise<Page<WorkerData>> {
  const externalSalonId = ctx.requireExternalSalonId();
  const items = await ctx.http<any[]>('GET', `/api/v1/company/${externalSalonId}/staff`);
  return { items: (items || []).map((w: any) => mapWorker(w, ctx)), fetched: items?.length ?? 0 };
}

export async function createWorker(ctx: AltegioContext, data: WorkerCreateInput): Promise<WorkerData> {
  // Altegio does not support creating staff via public API; surface as not supported.
  ctx.log.warn?.('createWorker not supported in Altegio');
  throw new CrmError('Altegio worker create is not supported', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
}

export async function updateWorker(ctx: AltegioContext, externalId: string, patch: WorkerUpdateInput): Promise<WorkerData> {
  const externalSalonId = ctx.requireExternalSalonId();
  const name = buildFullName(patch.firstName, patch.lastName);
  const body: any = {};
  if (name) body.name = name;
  if (patch.position !== undefined) body.specialization = patch.position ?? '';
  if (patch.description !== undefined) body.description = patch.description ?? '';
  if (patch.email !== undefined) body.email = patch.email ?? '';
  if (patch.phone !== undefined) body.phone = patch.phone ?? '';
  if (patch.photoUrl !== undefined) body.avatar = patch.photoUrl ?? '';
  if (patch.isActive !== undefined) {
    body.hidden = !patch.isActive;
    body.fired = !patch.isActive;
  }

  if (Object.keys(body).length === 0) {
    const existing = await ctx.http<any>('GET', `/api/v1/staff/${externalSalonId}/${externalId}`);
    return mapWorker(existing, ctx);
  }

  const res = await ctx.http<any>('PUT', `/api/v1/staff/${externalSalonId}/${externalId}`, { body });
  return mapWorker(res, ctx);
}

export async function deleteWorker(ctx: AltegioContext, externalId: string): Promise<void> {
  const externalSalonId = ctx.requireExternalSalonId();
  const body = { hidden: true, fired: true, is_bookable: false };
  await ctx.http('DELETE', `/api/v1/staff/${externalSalonId}/${externalId}`, { body });
}

function mapWorker(raw: any, ctx: AltegioContext): WorkerData {
  const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
  const { firstName, lastName } = splitName(name);
  return {
    externalId: String(raw?.id ?? ''),
    name,
    firstName,
    lastName,
    position: raw?.specialization ?? undefined,
    description: ctx.stripHtml?.(raw?.description) ?? undefined,
    photoUrl: raw?.avatar_big || raw?.avatar || undefined,
    email: raw?.email || undefined,
    phone: raw?.phone || undefined,
    isActive: raw?.is_bookable ?? !(raw?.hidden || raw?.fired),
    updatedAtIso: raw?.updated_at ?? raw?.updatedAt ?? undefined,
  };
}
