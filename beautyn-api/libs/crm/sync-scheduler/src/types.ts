import { CrmType } from '@crm/shared';

export type SyncJob = { salonId: string; provider: CrmType; requestId?: string };
export type CronDiffJob = { salonId: string; provider: CrmType; requestId?: string };
export interface CronDiffJobWithSchedule extends CronDiffJob { cron?: string; tz?: string }

export const SYNC_QUEUE = 'crm-sync';
export const CATEGORIES_QUEUE = 'crm-categories';
export const SERVICES_QUEUE = 'crm-services';
export const WORKERS_QUEUE = 'crm-workers';
export const CRON_DIFF_QUEUE = 'crm-cron-diff';
export const BOOKINGS_QUEUE = 'crm-bookings';
export const SALONS_QUEUE = 'crm-salons';
export const JOB_SYNC = 'sync';
export const JOB_CRON_DIFF = 'cron-diff';
