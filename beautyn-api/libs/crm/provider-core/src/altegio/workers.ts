import { WorkerData } from '../dtos';
import { WorkerCreateInput, WorkerUpdateInput } from '../types';
import { CrmError, ErrorKind } from '@crm/shared';
import { AltegioContext } from './context';

export async function pullWorkers(ctx: AltegioContext): Promise<WorkerData[]> {
  const externalSalonId = ctx.requireExternalSalonId();
  const items = await ctx.http<any[]>('GET', `/api/v1/company/${externalSalonId}/staff`);
  return (items || []).map((w: any) => mapWorker(w, ctx));
}

export async function createWorker(ctx: AltegioContext, data: WorkerCreateInput): Promise<WorkerData> {
  // Altegio does not support creating staff via public API; surface as not supported.
  ctx.log.warn?.('createWorker not supported in Altegio');
  throw new CrmError('Altegio worker create is not supported', { kind: ErrorKind.NOT_SUPPORTED, retryable: false });
}

export async function updateWorker(ctx: AltegioContext, externalId: string, patch: WorkerUpdateInput): Promise<WorkerData> {
  const externalSalonId = ctx.requireExternalSalonId();
  const name = buildName(patch);
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

function splitName(name: string): { firstName: string; lastName: string } {
  const parts = (name || '').split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: 'Unknown', lastName: 'Worker' };
  }
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Worker' };
  }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function buildName(patch: WorkerUpdateInput): string | null {
  const first = patch.firstName?.trim();
  const last = patch.lastName?.trim();
  if (!first && !last) return null;
  return [first, last].filter(Boolean).join(' ');
}
