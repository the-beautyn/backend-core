import { CrmType } from '@crm/shared';
import { CategoryData, ServiceData, WorkerData, WorkerSchedule, SalonData, Page } from './dtos';

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

/** Standardized provider API surface */
export interface ICrmProvider {
  /** Optional one-time setup per (salonId, provider). */
  init(ctx: ProviderContext): Promise<void>;

  // Sync surfaces
  // syncSalon(ctx: ProviderContext): Promise<void>;
  // syncCategories(ctx: ProviderContext): Promise<void>;
  // syncServices(ctx: ProviderContext): Promise<void>;
  // syncWorkers(ctx: ProviderContext): Promise<void>;

  // // Normalized pull (MVP) for SoT reconciliation
  pullSalon(ctx: ProviderContext): Promise<SalonData>;
  // pullCategories(ctx: ProviderContext, cursor?: string): Promise<Page<CategoryData>>;
  // pullServices(ctx: ProviderContext, cursor?: string): Promise<Page<ServiceData>>;
  // pullWorkers(ctx: ProviderContext, cursor?: string): Promise<Page<WorkerData>>;

  // // Booking lifecycle
  // createBooking(ctx: ProviderContext, payload: CreateBookingInput): Promise<{ externalBookingId: string }>;
  // rescheduleBooking(ctx: ProviderContext, payload: RescheduleBookingInput): Promise<void>;
  // cancelBooking(ctx: ProviderContext, payload: CancelBookingInput): Promise<void>;
  // completeBooking(ctx: ProviderContext, payload: CompleteBookingInput): Promise<void>;
  // getAvailability(ctx: ProviderContext, input: GetAvailabilityInput): Promise<{ slots: AvailabilitySlot[]; timezone?: string; currency?: string }>;

  // // Master-data CRUD (commands)
  // // Salon
  // updateSalon(ctx: ProviderContext, patch: Partial<Omit<SalonData, 'externalId'>>): Promise<void>;

  // // Categories
  // createCategory(ctx: ProviderContext, data: Omit<CategoryData, 'externalId' | 'updatedAtIso'> & { clientId?: string }): Promise<{ externalId: string }>;
  // updateCategory(ctx: ProviderContext, externalId: string, patch: Partial<Omit<CategoryData, 'externalId'>>): Promise<void>;
  // deleteCategory(ctx: ProviderContext, externalId: string): Promise<void>;

  // // Services
  // createService(ctx: ProviderContext, data: Omit<ServiceData, 'externalId' | 'updatedAtIso'> & { clientId?: string }): Promise<{ externalId: string }>;
  // updateService(ctx: ProviderContext, externalId: string, patch: Partial<Omit<ServiceData, 'externalId'>>): Promise<void>;
  // deleteService(ctx: ProviderContext, externalId: string): Promise<void>;

  // // Workers
  // createWorker(ctx: ProviderContext, data: Omit<WorkerData, 'externalId' | 'updatedAtIso'> & { clientId?: string }): Promise<{ externalId: string }>;
  // updateWorker(ctx: ProviderContext, externalId: string, patch: Partial<Omit<WorkerData, 'externalId'>>): Promise<void>;
  // deleteWorker(ctx: ProviderContext, externalId: string): Promise<void>;
  // updateWorkerSchedule(ctx: ProviderContext, externalId: string, schedule: WorkerSchedule): Promise<void>;
}
