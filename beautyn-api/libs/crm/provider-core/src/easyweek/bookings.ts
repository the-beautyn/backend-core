import { CrmError, ErrorKind } from '@crm/shared';
import { EasyWeekContext } from './context';

export type EasyWeekBooking = {
  uuid: string;
  locationUuid?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  timezone?: string | null;
  isCanceled?: boolean;
  isCompleted?: boolean;
  statusName?: string | null;
  orderedServices?: any[];
  order?: any;
  duration?: any;
  policy?: any;
  links?: any;
  raw?: any;
};

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
    orderedServices: ordered,
    order: booking.order ?? null,
    duration: booking.duration ?? null,
    policy: booking.policy ?? null,
    links: booking.links ?? null,
    raw: booking,
  };
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
