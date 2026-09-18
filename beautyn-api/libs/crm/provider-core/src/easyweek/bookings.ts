import { CrmError, ErrorKind } from '@crm/shared';
import { EasyWeekContext } from './context';
import { Page } from '../dtos';

/**
 * The customer EasyWeek attaches to a booking. Present on both the create response
 * and the booking GET. `phone` already arrives in E.164 ("+380950000001"), and
 * `uuid` is stable per customer — the external key a clients table would key on.
 */
export type EasyWeekBookingCustomer = {
  uuid?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleName?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type EasyWeekBooking = {
  uuid: string;
  locationUuid?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  timezone?: string | null;
  isCanceled?: boolean;
  isCompleted?: boolean;
  statusName?: string | null;
  publicNotes?: string | null;
  orderedServices?: any[];
  order?: any;
  duration?: any;
  policy?: any;
  links?: any;
  customer?: EasyWeekBookingCustomer | null;
  raw?: any;
};

function normalizeCustomer(raw: any): EasyWeekBookingCustomer | null {
  if (!raw || typeof raw !== 'object') return null;
  return {
    uuid: raw.uuid ?? null,
    firstName: raw.first_name ?? raw.firstName ?? null,
    lastName: raw.last_name ?? raw.lastName ?? null,
    middleName: raw.middle_name ?? raw.middleName ?? null,
    phone: raw.phone ?? null,
    email: raw.email ?? null,
  };
}

function normalizeBooking(raw: any, fallbackUuid: string): EasyWeekBooking {
  const booking = raw ?? {};
  const ordered = Array.isArray(booking.ordered_services)
    ? booking.ordered_services
    : Array.isArray(booking.orderedServices)
      ? booking.orderedServices
      : [];

  const uuid = booking.uuid ?? fallbackUuid;
  if (!uuid) {
    throw new CrmError('EasyWeek booking UUID is missing', {
      kind: ErrorKind.VALIDATION,
      retryable: false,
    });
  }

  return {
    uuid: String(uuid),
    locationUuid: booking.location_uuid ?? booking.locationUuid ?? null,
    startTime: booking.start_time ?? booking.startTime ?? null,
    endTime: booking.end_time ?? booking.endTime ?? null,
    timezone: booking.timezone ?? null,
    isCanceled: booking.is_canceled ?? booking.isCanceled ?? undefined,
    isCompleted: booking.is_completed ?? booking.isCompleted ?? undefined,
    statusName: booking.status?.name ?? booking.status ?? null,
    publicNotes: booking.public_notes ?? booking.publicNotes ?? null,
    orderedServices: ordered,
    order: booking.order ?? null,
    duration: booking.duration ?? null,
    policy: booking.policy ?? null,
    links: booking.links ?? null,
    customer: normalizeCustomer(booking.customer),
    raw: booking,
  };
}

export async function pullBookings(ctx: EasyWeekContext, bookingIds: string[]): Promise<Page<EasyWeekBooking>> {
  const ids = (bookingIds ?? []).map((id) => String(id)).filter((id) => id.length > 0);
  const items: EasyWeekBooking[] = [];

  for (let i = 0; i < ids.length; i += 1) {
    const bookingId = ids[i];
    try {
      const booking = await fetchBooking(ctx, bookingId);
      items.push(booking);
    } catch (e) {
      if (e instanceof CrmError && e.kind === ErrorKind.VALIDATION) {
        continue;
      }
      throw e;
    }
    if (i < ids.length - 1) {
      await wait(1000);
    }
  }

  return { items, fetched: items.length, total: ids.length };
}

export async function fetchBooking(ctx: EasyWeekContext, bookingUuid: string): Promise<EasyWeekBooking> {
  const url = `${ctx.base}/bookings/${encodeURIComponent(bookingUuid)}`;
  try {
    const res = await ctx.doFetch(url, { method: 'GET' });
    const payload = (res as any)?.data ?? res;
    return normalizeBooking(payload, bookingUuid);
  } catch (e) {
    if (e instanceof CrmError) {
      const msg = e.message || '';
      if (msg.includes('HTTP 404')) {
        throw new CrmError('EasyWeek booking not found', { kind: ErrorKind.VALIDATION, retryable: false, cause: e, vendorMessage: e.vendorMessage });
      }
    }
    throw e;
  }
}

async function wait(ms: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
}
