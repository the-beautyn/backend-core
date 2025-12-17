import { AltegioContext } from './context';

export type AltegioBookCategory = { id: number; title?: string };
export type AltegioBookService = {
  id: number;
  title?: string;
  category_id?: number | null;
  first_cost?: number | null;
  discount?: number | null;
  cost?: number | null;
  seance_length?: number | null;
  sum_length?: number | null;
  is_combo?: boolean;
  is_complex?: boolean;
};

export type AltegioBookServicesResponse = {
  categories?: AltegioBookCategory[];
  services?: AltegioBookService[];
};

export type AltegioBookStaff = {
  id: number;
  name?: string;
  profession?: string;
  avatar?: string | null;
  rating?: number | null;
};

export type AltegioBookStaffResponse = {
  staff?: AltegioBookStaff[];
};

export type AltegioBookDatesResponse = {
  booking_dates?: string[];
};

export type AltegioBookTime = {
  time: string;
  datetime: string;
  seance_length?: number | null;
  sum_length?: number | null;
};

export type AltegioBookTimesResponse = {
  times?: AltegioBookTime[];
};

export type AltegioCreateRecordPayload = {
  staff_id: number;
  services: Array<{ id: number }>;
  client?: { phone?: string | null; name?: string | null; email?: string | null };
  datetime: string;
  seance_length?: number | null;
  comment?: string | null;
  save_if_busy?: boolean;
  attendance?: number;
};

export type AltegioCreateRecordResponse = { id: number; short_link?: string | null };

export async function getBookServices(
  ctx: AltegioContext,
  args?: { serviceIds?: number[]; staffId?: number },
): Promise<AltegioBookServicesResponse> {
  const externalSalonId = ctx.requireExternalSalonId();
  const query: Record<string, any> = {};
  if (args?.serviceIds?.length) query['service_ids[]'] = args.serviceIds;
  if (args?.staffId !== undefined) query.staff_id = args.staffId;
  return ctx.http<AltegioBookServicesResponse>('GET', `/api/v1/book_services/${externalSalonId}`, { query });
}

export async function getBookStaff(
  ctx: AltegioContext,
  args?: { serviceIds?: number[]; datetime?: string },
): Promise<AltegioBookStaffResponse> {
  const externalSalonId = ctx.requireExternalSalonId();
  const query: Record<string, any> = {};
  if (args?.serviceIds?.length) query['service_ids[]'] = args.serviceIds;
  if (args?.datetime) query.datetime = args.datetime;
  return ctx.http<AltegioBookStaffResponse>('GET', `/api/v1/book_staff/${externalSalonId}`, { query });
}

export async function getBookDates(
  ctx: AltegioContext,
  args?: { serviceIds?: number[]; staffId?: number; dateFrom?: string; dateTo?: string },
): Promise<AltegioBookDatesResponse> {
  const externalSalonId = ctx.requireExternalSalonId();
  const query: Record<string, any> = {};
  if (args?.serviceIds?.length) query['service_ids[]'] = args.serviceIds;
  if (args?.staffId !== undefined) query.staff_id = args.staffId;
  if (args?.dateFrom) query.date_from = args.dateFrom;
  if (args?.dateTo) query.date_to = args.dateTo;
  return ctx.http<AltegioBookDatesResponse>('GET', `/api/v1/book_dates/${externalSalonId}`, { query });
}

export async function getBookTimes(
  ctx: AltegioContext,
  args: { staffId: number; date: string; serviceIds?: number[] },
): Promise<AltegioBookTimesResponse> {
  const externalSalonId = ctx.requireExternalSalonId();
  const query: Record<string, any> = {};
  if (args?.serviceIds?.length) query['service_ids[]'] = args.serviceIds;
  return ctx.http<AltegioBookTimesResponse>('GET', `/api/v1/book_times/${externalSalonId}/${args.staffId}/${args.date}`, {
    query,
  });
}

export async function createRecord(ctx: AltegioContext, payload: AltegioCreateRecordPayload): Promise<AltegioCreateRecordResponse> {
  const externalSalonId = ctx.requireExternalSalonId();
  return ctx.http<AltegioCreateRecordResponse>('POST', `/api/v1/records/${externalSalonId}`, { body: payload });
}
