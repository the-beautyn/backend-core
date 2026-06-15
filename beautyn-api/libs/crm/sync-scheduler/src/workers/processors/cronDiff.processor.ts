import { CRON_DIFF_QUEUE, CronDiffJob, BookingsDispatchJob, JOB_BOOKINGS_DISPATCH } from '../../types';
import { ProviderFactory } from '@crm/provider-core';
import { executeWithRetry } from '@crm/retry-handler';
import { runWithRequestContext, createChildLogger } from '@shared/logger';

const log = createChildLogger('worker.cron-diff');

// A bookings-dispatch tick: fan out to per-salon bookings jobs by hitting the internal dispatch
// endpoint (the worker has no DB access; salon enumeration + enqueue happen in the API process).
async function handleBookingsDispatch(job: any) {
  const data: BookingsDispatchJob = job.data;
  return runWithRequestContext({ requestId: data.requestId ?? `dispatch-${job.id}` }, async () => {
    const { lane } = data;
    log.info('Bookings dispatch tick', { lane, jobId: job.id });

    const base = process.env.INTERNAL_API_BASE_URL?.trim();
    const key = process.env.INTERNAL_API_KEY?.trim();
    if (!base || !key) {
      log.warn('Skip bookings dispatch: INTERNAL_API_BASE_URL or INTERNAL_API_KEY not set', { lane, jobId: job.id });
      return;
    }

    try {
      const res = await executeWithRetry(() =>
        fetch(`${base}/api/v1/internal/bookings/dispatch`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-internal-key': key },
          body: JSON.stringify({ lane }),
        } as any),
      );
      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        log.warn('Bookings dispatch failed', { lane, jobId: job.id, status: res.status, body });
      } else {
        log.info('Bookings dispatch enqueued', { lane, jobId: job.id, status: res.status, body });
      }
    } catch (err) {
      log.warn('Bookings dispatch failed', { lane, jobId: job.id, error: (err as Error)?.message });
    }
  });
}

export function startCronDiffWorker(container: { providerFactory: ProviderFactory }) {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL is required');

  // Lazy require so tests can mock 'bullmq' without type deps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require('bullmq');

  const worker = new Worker(
    CRON_DIFF_QUEUE,
    async (job: any) => {
      // Bookings-dispatch ticks are the active producer on this queue.
      if (job.name === JOB_BOOKINGS_DISPATCH || job.data?.lane) {
        return handleBookingsDispatch(job);
      }

      // Legacy per-salon cron-diff path (not currently scheduled; kept harmless).
      const data: CronDiffJob = job.data;
      return runWithRequestContext({ requestId: data.requestId ?? `job-${job.id}` }, async () => {
        const { salonId, provider } = data;
        log.info('Cron diff started', { salonId, provider, jobId: job.id });

        const pf = container.providerFactory;
        const p = pf.make(provider);
        await p.init({ salonId, provider });

        log.info('Cron diff completed', { salonId, provider, jobId: job.id });
      });
    },
    { connection: { url: REDIS_URL }, concurrency: Math.max(1, Number.parseInt(process.env.CRM_WORKER_CONCURRENCY ?? '') || 1) },
  );

  return worker;
}


