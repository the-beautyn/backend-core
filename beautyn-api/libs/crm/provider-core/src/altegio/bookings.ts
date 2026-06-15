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

export type ListRecordsParams = {
  startDate?: string; // YYYY-MM-DD, visit-date window start
  endDate?: string; // YYYY-MM-DD, visit-date window end
  withDeleted?: boolean; // include cancelled/deleted records (flagged isDeleted)
  count?: number; // page size (Altegio caps at 200)
};

// Fetch a company's records in one paginated list call (`GET /records/{company_id}`), instead of
// one GET per id. Returns every record in the visit-date window — callers MUST scope to records
// they own (by crmRecordId). `withDeleted` makes cancelled records come back flagged
// `isDeleted` rather than 404-vanishing, so cancellations are observed.
export async function listRecords(ctx: AltegioContext, params: ListRecordsParams): Promise<Page<AltegioBooking>> {
  const externalSalonId = ctx.requireExternalSalonId();
  // Altegio caps a page at 200; page until a short page comes back (the envelope's `meta` is
  // stripped by `http()`, so we can't read total_count — a partial page means we're done).
  const count = Math.min(Math.max(params.count ?? 200, 1), 200);
  const items: AltegioBooking[] = [];

  for (let page = 1; page <= 1000; page += 1) {
    const query: Record<string, any> = { page, count };
    if (params.startDate) query.start_date = params.startDate;
    if (params.endDate) query.end_date = params.endDate;
    if (params.withDeleted) query.with_deleted = 1;

    const res = await ctx.http<any>('GET', `/api/v1/records/${externalSalonId}`, { query });
    const records: any[] = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    for (const record of records) {
      items.push(mapRecord(record));
    }
    if (records.length < count) break;
    await wait(300);
  }

  return { items, fetched: items.length, total: items.length };
}

async function fetchBooking(ctx: AltegioContext, salonId: number, bookingId: string): Promise<AltegioBooking> {
  const res = await ctx.http<any>('GET', `/api/v1/record/${salonId}/${encodeURIComponent(bookingId)}`);
  const payload = (res as any)?.data ?? res;
  return mapRecord(payload, bookingId);
}

// Maps a raw Altegio record to our AltegioBooking. The single-record and list endpoints return
// the same record shape, so both paths share this. `fallbackId` keeps the crmRecordId when a
// single fetch echoes no id.
function mapRecord(payload: any, fallbackId?: string): AltegioBooking {
  return {
    crmRecordId: payload?.id ? String(payload.id) : fallbackId ?? null,
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
