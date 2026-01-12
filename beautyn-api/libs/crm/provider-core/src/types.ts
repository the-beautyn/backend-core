import { CrmType } from '@crm/shared';
import { CategoryData, ServiceData, WorkerData, WorkerSchedule, WorkerWorkingSchedule, SalonData, Page, BookingData } from './dtos';
import { AltegioBooking } from './altegio/bookings';
import { EasyWeekBooking } from './easyweek/bookings';

/** Minimal context for a provider operation */
export interface ProviderContext {
  salonId: string;        // our UUID
  provider: CrmType;      // 'ALTEGIO' | 'EASYWEEK'
}

/** Booking inputs kept intentionally generic for now */
export interface CreateBookingInput {
  externalServiceId?: string;
  externalWorkerId?: string;
  startAtIso: string;     // ISO-8601
  durationMin?: number;
  note?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
    externalCustomerId?: string;
  };
  extra?: Record<string, unknown>;
}

export interface RescheduleBookingInput {
  externalBookingId: string;
  newStartAtIso: string;
  newDurationMin?: number;
  extra?: Record<string, unknown>;
}

export interface CancelBookingInput {
  externalBookingId: string;
  reason?: string;
  extra?: Record<string, unknown>;
}

export interface CompleteBookingInput {
  externalBookingId: string;
  accountExternalId?: string;
  stafferExternalId?: string;
  internalNotes?: string;
  paidAmountMinor?: number;
  extra?: Record<string, unknown>;
}

export interface GetAvailabilityInput {
  externalServiceId: string;
  externalWorkerId?: string;
  rangeStartIso?: string;
  rangeEndIso?: string;
  timezone?: string;
}

export type AvailabilitySlot = {
  startIso: string;
  endIso: string;
  priceMinor?: number;
  quantity?: number;
};

export type CategoryCreateInput = {
  title: string;
  weight?: number | null;
  staff?: number[];
};

export type CategoryUpdateInput = {
  title?: string;
  weight?: number | null;
  staff?: number[];
};

export type ServiceCreateInput = {
  name: string;
  duration?: number;
  price?: number;
  currency?: string;
  categoryExternalId?: string | null;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number | null;
  workerExternalIds?: string[];
};

export type ServiceUpdateInput = {
  name?: string;
  duration?: number;
  price?: number;
  currency?: string;
  categoryExternalId?: string | null;
  description?: string | null;
  isActive?: boolean;
  sortOrder?: number | null;
  workerExternalIds?: string[];
};

export type WorkerCreateInput = {
  firstName: string;
  lastName: string;
  position?: string | null;
  description?: string | null;
  email?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  isActive?: boolean;
  workingSchedule?: WorkerWorkingSchedule | null;
};

export type WorkerUpdateInput = Partial<WorkerCreateInput> & {
  firstName?: string;
  lastName?: string;
};

/** Standardized provider API surface */
export interface ICrmProvider {
  /** Optional one-time setup per (salonId, provider). */
  init(ctx: ProviderContext): Promise<void>;
  // // Normalized pull (MVP) for SoT reconciliation
  // Salon
  pullSalon(): Promise<SalonData>;

  // Bookings
  pullAltegioBookings(bookingIds: string[]): Promise<Page<AltegioBooking>>;
  pullEasyWeekBookings(bookingIds: string[]): Promise<Page<EasyWeekBooking>>;
  // Categories
  pullCategories(): Promise<Page<CategoryData>>;
  createCategory(data: CategoryCreateInput): Promise<CategoryData>;
  updateCategory(externalId: string, patch: CategoryUpdateInput): Promise<CategoryData>;
  deleteCategory(externalId: string): Promise<void>;

  // Services
  pullServices(): Promise<Page<ServiceData>>;
  createService(data: ServiceCreateInput): Promise<ServiceData>;
  updateService(externalId: string, patch: ServiceUpdateInput): Promise<ServiceData>;
  deleteService(externalId: string): Promise<void>;

  // Workers
  pullWorkers(): Promise<Page<WorkerData>>;
  createWorker(data: WorkerCreateInput): Promise<WorkerData>;
  updateWorker(externalId: string, patch: WorkerUpdateInput): Promise<WorkerData>;
  deleteWorker(externalId: string): Promise<void>;
}
