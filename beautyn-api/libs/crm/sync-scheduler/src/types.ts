import { CrmType } from '@crm/shared';

// Booking-sync lanes: 'fast' = frequent, narrow window (imminent bookings); 'slow' = full reconcile.
export type Lane = 'fast' | 'slow';

export type SyncJob = { salonId: string; provider: CrmType; requestId?: string; lane?: Lane };
export type CronDiffJob = { salonId: string; provider: CrmType; requestId?: string };
export interface CronDiffJobWithSchedule extends CronDiffJob { cron?: string; tz?: string }
// Payload of a bookings-dispatch tick (fan-out trigger, carries no salon).
export type BookingsDispatchJob = { lane: Lane; requestId?: string };

export const SYNC_QUEUE = 'crm-sync';
export const CATEGORIES_QUEUE = 'crm-categories';
export const SERVICES_QUEUE = 'crm-services';
export const WORKERS_QUEUE = 'crm-workers';
export const CRON_DIFF_QUEUE = 'crm-cron-diff';
export const BOOKINGS_QUEUE = 'crm-bookings';
export const SALONS_QUEUE = 'crm-salons';
export const JOB_SYNC = 'sync';
export const JOB_CRON_DIFF = 'cron-diff';
export const JOB_BOOKINGS_DISPATCH = 'bookings-dispatch';
