import { CrmType } from '@crm/shared';
import { CreateBookingInput, RescheduleBookingInput, CancelBookingInput, GetAvailabilityInput, CompleteBookingInput, SalonData, CategoryData, ServiceData, WorkerData, Page } from '@crm/provider-core';

export interface ICrmAdapter {
  // /** Enqueue a full sync immediately (idempotent jobId per salon+provider). */
  // requestSync(salonId: string, provider: CrmType, requestId?: string): Promise<string>;

  // /**
  //  * Ensure a repeating sync using a CRON pattern.
  //  * Examples: '0 0-23/2 * * *' (every 2 hours), '0 2 * * *' (daily at 02:00).
  //  * Optional tz: IANA TZ name (e.g., 'Europe/Kyiv').
  //  */
  // ensureCronSync(salonId: string, provider: CrmType, cron: string, tz?: string, requestId?: string): Promise<void>;

  // // Booking lifecycle
  // createBooking(salonId: string, provider: CrmType, payload: CreateBookingInput): Promise<{ externalBookingId: string }>;
  // rescheduleBooking(salonId: string, provider: CrmType, payload: RescheduleBookingInput): Promise<void>;
  // cancelBooking(salonId: string, provider: CrmType, payload: CancelBookingInput): Promise<void>;
  // completeBooking(salonId: string, provider: CrmType, payload: CompleteBookingInput): Promise<void>;
  // getAvailability(salonId: string, provider: CrmType, input: GetAvailabilityInput): Promise<{ slots: Array<{ startIso: string; endIso: string; priceMinor?: number; quantity?: number }>; timezone?: string; currency?: string }>;

  // Onboarding pulls
  /** Stage 1: Pull normalized salon profile for initial configuration. */
  pullSalon(salonId: string, provider: CrmType): Promise<SalonData>;
  // /** Stage 2: Pull internal entities; cursor is vendor-opaque. */
  // pullCategories(salonId: string, provider: CrmType, cursor?: string): Promise<Page<CategoryData>>;
  // pullServices(salonId: string, provider: CrmType, cursor?: string): Promise<Page<ServiceData>>;
  // pullWorkers(salonId: string, provider: CrmType, cursor?: string): Promise<Page<WorkerData>>;
}
