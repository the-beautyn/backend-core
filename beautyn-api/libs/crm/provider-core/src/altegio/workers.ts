import { WorkerData, Page } from '../dtos';
import { AltegioContext } from './context';

export async function pullWorkers(ctx: AltegioContext): Promise<Page<WorkerData>> {
  const externalSalonId = ctx.requireExternalSalonId();
  const items = await ctx.http<any[]>('GET', `/api/v1/company/${externalSalonId}/staff`);
  const mapped: WorkerData[] = (items || []).map((w: any) => ({
    externalId: String(w.id),
    name: w.name,
    position: w.specialization,
    photoUrl: w.avatar_big || w.avatar || undefined,
    email: w.email || undefined,
    phone: w.phone || undefined,
    isActive: w.is_bookable ?? true,
  }));
  return { items: mapped, fetched: mapped.length };
}


