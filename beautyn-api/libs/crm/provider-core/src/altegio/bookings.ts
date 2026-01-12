import { CrmError, ErrorKind } from '@crm/shared';
import { AltegioContext } from './context';
import { Page } from '../dtos';

export type AltegioBooking = {
  crmRecordId?: string | null;
  companyId?: string | null;
  staffId?: string | null;
  clientId?: string | null;
  datetime?: string | null;
  date?: string | null;
  comment?: string | null;
  attendance?: number | null;
  confirmed?: number | null;
  visitAttendance?: number | null;
  length?: number | null;
  seanceLength?: number | null;
  isDeleted?: boolean | null;
  staff?: any;
  client?: any;
  services?: any;
  documents?: any;
  goodsTransactions?: any;
  raw?: any;
};

export async function pullBookings(ctx: AltegioContext, bookingIds: string[]): Promise<Page<AltegioBooking>> {
  const externalSalonId = ctx.requireExternalSalonId();
  const ids = (bookingIds ?? []).map((id) => String(id)).filter((id) => id.length > 0);
  const items: AltegioBooking[] = [];

  for (let i = 0; i < ids.length; i += 1) {
    const bookingId = ids[i];
    try {
      const booking = await fetchBooking(ctx, externalSalonId, bookingId);
      items.push(booking);
    } catch (e) {
      if (e instanceof CrmError && e.kind === ErrorKind.VALIDATION) {
        continue;
      }
      throw e;
    }
    if (i < ids.length - 1) {
      await wait(300);
    }
  }

  return { items, fetched: items.length, total: ids.length };
}

async function fetchBooking(ctx: AltegioContext, salonId: number, bookingId: string): Promise<AltegioBooking> {
  const res = await ctx.http<any>('GET', `/api/v1/record/${salonId}/${encodeURIComponent(bookingId)}`);
  const payload = (res as any)?.data ?? res;

  return {
    crmRecordId: payload?.id ? String(payload.id) : bookingId,
    companyId: payload?.company_id ? String(payload.company_id) : null,
    staffId: payload?.staff_id ? String(payload.staff_id) : null,
    clientId: payload?.client?.id ? String(payload.client.id) : null,
    datetime: payload?.datetime ?? null,
    date: payload?.date ?? null,
    comment: payload?.comment ?? null,
    attendance: payload?.attendance ?? null,
    confirmed: payload?.confirmed ?? null,
    visitAttendance: payload?.visit_attendance ?? null,
    length: payload?.length ?? null,
    seanceLength: payload?.seance_length ?? null,
    isDeleted: payload?.deleted ?? payload?.is_deleted ?? null,
    staff: payload?.staff ?? null,
    client: payload?.client ?? null,
    services: payload?.services ?? null,
    documents: payload?.documents ?? null,
    goodsTransactions: payload?.goods_transactions ?? null,
    raw: payload ?? null,
  };
}

async function wait(ms: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
