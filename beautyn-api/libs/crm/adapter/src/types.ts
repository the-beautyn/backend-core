import { CrmType } from '@crm/shared';
import { CreateBookingInput, RescheduleBookingInput, CancelBookingInput } from '@crm/provider-core';

export interface ICrmAdapter {
  /** Enqueue a full sync immediately (idempotent jobId per salon+provider). */
  requestSync(salonId: string, provider: CrmType, requestId?: string): Promise<string>;

  /**
   * Ensure a repeating sync using a CRON pattern.
   * Examples: '0 0-23/2 * * *' (every 2 hours), '0 2 * * *' (daily at 02:00).
   * Optional tz: IANA TZ name (e.g., 'Europe/Kyiv').
   */
  ensureCronSync(salonId: string, provider: CrmType, cron: string, tz?: string, requestId?: string): Promise<void>;

  // Booking lifecycle
  createBooking(salonId: string, provider: CrmType, payload: CreateBookingInput): Promise<{ externalBookingId: string }>;
  rescheduleBooking(salonId: string, provider: CrmType, payload: RescheduleBookingInput): Promise<void>;
  cancelBooking(salonId: string, provider: CrmType, payload: CancelBookingInput): Promise<void>;
}
