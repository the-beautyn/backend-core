import { CrmType } from '@crm/shared';
import { CreateBookingInput, RescheduleBookingInput, CancelBookingInput, GetAvailabilityInput, CompleteBookingInput, SalonData, CategoryData, CategoryCreateInput, CategoryUpdateInput, ServiceData, WorkerData, Page, BookingData } from '@crm/provider-core';

export type CategoryCreatePayload = CategoryCreateInput;

export type CategoryUpdatePayload = CategoryUpdateInput;

export interface ICrmAdapter {
  
  // /** Enqueue a full sync immediately (idempotent jobId per salon+provider). */
  // requestSync(salonId: string, provider: CrmType, requestId?: string): Promise<string>;

  // /**
  //  * Ensure a repeating sync using a CRON pattern.
  //  * Examples: '0 0-23/2 * * *' (every 2 hours), '0 2 * * *' (daily at 02:00).
  //  * Optional tz: IANA TZ name (e.g., 'Europe/Kyiv').
  //  */
  // ensureCronSync(salonId: string, provider: CrmType, cron: string, tz?: string, requestId?: string): Promise<void>;

  syncCategories(salonId: string, provider: CrmType): Promise<void>;
  // // Booking lifecycle
  // createBooking(salonId: string, provider: CrmType, payload: CreateBookingInput): Promise<{ externalBookingId: string }>;
  // rescheduleBooking(salonId: string, provider: CrmType, payload: RescheduleBookingInput): Promise<void>;
  // cancelBooking(salonId: string, provider: CrmType, payload: CancelBookingInput): Promise<void>;
  // completeBooking(salonId: string, provider: CrmType, payload: CompleteBookingInput): Promise<void>;
  // getAvailability(salonId: string, provider: CrmType, input: GetAvailabilityInput): Promise<{ slots: Array<{ startIso: string; endIso: string; priceMinor?: number; quantity?: number }>; timezone?: string; currency?: string }>;

  // Onboarding pulls
  /** Stage 1: Pull normalized salon profile for initial configuration. */
  pullSalon(salonId: string, provider: CrmType): Promise<SalonData>;
  // pullServices(salonId: string, provider: CrmType, cursor?: string): Promise<Page<ServiceData>>;
  // pullWorkers(salonId: string, provider: CrmType, cursor?: string): Promise<Page<WorkerData>>;

  // Bookings pull
  pullBookings(
    salonId: string,
    provider: CrmType,
    args?: { clientExternalId?: string; withDeleted?: boolean; startDate?: string; endDate?: string; }
  ): Promise<BookingData[]>;

  pullCategories(salonId: string, provider: CrmType, cursor?: string): Promise<Page<CategoryData>>;
  createCategory(salonId: string, provider: CrmType, payload: CategoryCreatePayload): Promise<CategoryData>;
  updateCategory(salonId: string, provider: CrmType, externalId: string, payload: CategoryUpdatePayload): Promise<CategoryData>;
  deleteCategory(salonId: string, provider: CrmType, externalId: string): Promise<void>;
}
