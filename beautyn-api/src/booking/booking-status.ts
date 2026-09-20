/**
 * The booking statuses that mean "this appointment is not happening".
 *
 * EasyWeek cancels to `canceled`; Altegio soft-deletes to `deleted`. Every consumer
 * — the tab buckets, `cancelledAt` stamping and the salon-client counters — must
 * agree on this set, so it lives here rather than as a private copy per service.
 */
export const BOOKING_CANCELLED_STATUSES: string[] = ['canceled', 'deleted'];

export function isCancelledStatus(status: string | null | undefined): boolean {
  return status != null && BOOKING_CANCELLED_STATUSES.includes(status);
}
