import { CrmType } from '@crm/shared';

export type SyncJob = { salonId: string; provider: CrmType; requestId?: string };
export type CronDiffJob = { salonId: string; provider: CrmType; requestId?: string };

export const SYNC_QUEUE = 'crm-sync';
export const JOB_SYNC = 'sync';
export const JOB_CRON_DIFF = 'cron-diff';

