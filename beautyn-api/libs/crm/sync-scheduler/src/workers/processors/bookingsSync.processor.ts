import { BOOKINGS_QUEUE, SyncJob } from '../../types';
import { executeWithRetry } from '@crm/retry-handler';
import { runWithRequestContext, createChildLogger } from '@shared/logger';

const log = createChildLogger('worker.bookings-sync');

export function startBookingsSyncWorker(_container: { providerFactory: unknown }) {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL is required');

  // Lazy require so tests can mock 'bullmq' without type deps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require('bullmq');

  const worker = new Worker(
    BOOKINGS_QUEUE,
    async (job: any) => {
    const data: SyncJob = job.data;
    return runWithRequestContext({ requestId: data.requestId ?? `job-${job.id}` }, async () => {
      const { salonId, provider } = data;
      log.info('Bookings sync started', { salonId, provider, jobId: job.id });

      const base = process.env.INTERNAL_API_BASE_URL?.trim();
      const key = process.env.INTERNAL_API_KEY?.trim();
      if (!base || !key) {
        log.warn('Skip bookings sync: INTERNAL_API_BASE_URL or INTERNAL_API_KEY not set', { salonId, provider, jobId: job.id });
        return;
      }

      try {
        const res = await executeWithRetry(() =>
          fetch(`${base}/api/v1/internal/bookings/rebase`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-internal-key': key },
            body: JSON.stringify({ salon_id: salonId }),
          } as any),
        );
        const body = await res.json().catch(() => ({} as any));
        log.info('Synced bookings', { salonId, provider, jobId: job.id, status: res.status, ok: res.ok, body });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          log.warn('Bookings sync failed', { salonId, provider, jobId: job.id, status: res.status, body: text?.slice(0, 500) });
        }
      } catch (err) {
        log.warn('Bookings sync failed', { salonId, provider, jobId: job.id, error: (err as Error)?.message });
      }

      log.info('Bookings sync completed', { salonId, provider, jobId: job.id });
    });
  },
    { connection: { url: REDIS_URL }, concurrency: Math.max(1, Number.parseInt(process.env.CRM_WORKER_CONCURRENCY ?? '') || 1) },
  );

  worker.on('completed', (job: any) => log.info('Bookings job completed', { jobId: job.id }));
  worker.on('failed', (job: any, err: any) => log.warn('Bookings job failed', { jobId: job?.id, error: (err as Error)?.message }));

  return worker;
}
