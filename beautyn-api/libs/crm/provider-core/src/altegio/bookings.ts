import { BookingData } from '../dtos';
import { AltegioContext } from './context';

export async function pullBookings(ctx: AltegioContext, args?: { clientExternalId?: string; withDeleted?: boolean; startDate?: string; endDate?: string; page?: number; count?: number }): Promise<BookingData[]> {
  const externalSalonId = ctx.requireExternalSalonId();
  const query: Record<string, any> = {};
  if (args?.clientExternalId) query.client_id = args.clientExternalId;
  if (args?.withDeleted !== undefined) query.with_deleted = args.withDeleted ? 1 : 0;
  if (args?.startDate) query.start_date = args.startDate;
  if (args?.endDate) query.end_date = args.endDate;
  if (args?.page && args?.page > 0) query.page = args.page;
  if (args?.count && args?.count > 0) query.count = args.count;
  const items = await ctx.http<any[]>('GET', `/api/v1/records/${externalSalonId}`, { query });
  return (items || []).map((b: any) => ({
    externalId: String(b.id),
    startAtIso: b.datetime,
    durationMin: b.seance_length ?? undefined,
    note: b.comment ?? undefined,
    isDeleted: !!b.is_deleted,
    workerExternalId: b.staff?.id ? String(b.staff.id) : undefined,
    serviceExternalIds: Array.isArray(b.services) ? b.services.map((s: any) => String(s?.id)).filter(Boolean) : undefined,
  }));
}


