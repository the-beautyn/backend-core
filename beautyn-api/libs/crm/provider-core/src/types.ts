import { CrmType } from '@crm/shared';

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

/** Standardized provider API surface */
export interface ICrmProvider {
  /** Optional one-time setup per (salonId, provider). */
  init(ctx: ProviderContext): Promise<void>;

  // Sync surfaces
  syncSalon(ctx: ProviderContext): Promise<void>;
  syncCategories(ctx: ProviderContext): Promise<void>;
  syncServices(ctx: ProviderContext): Promise<void>;
  syncWorkers(ctx: ProviderContext): Promise<void>;

  // Booking lifecycle
  createBooking(ctx: ProviderContext, payload: CreateBookingInput): Promise<{ externalBookingId: string }>;
  rescheduleBooking(ctx: ProviderContext, payload: RescheduleBookingInput): Promise<void>;
  cancelBooking(ctx: ProviderContext, payload: CancelBookingInput): Promise<void>;
}

