import { SYNC_QUEUE, CronDiffJob } from '../types';
import { ProviderFactory } from '@crm/provider-core';
import { executeWithRetry } from '@crm/retry-handler';
import { runWithRequestContext, createChildLogger } from '@shared/logger';

const log = createChildLogger('worker.cron-diff');

export function startNightlyDiffWorker(container: { providerFactory: ProviderFactory }) {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL is required');

  // Lazy require so tests can mock 'bullmq' without type deps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require('bullmq');

  const worker = new Worker(
    SYNC_QUEUE,
    async (job: any) => {
      const data: CronDiffJob = job.data;
      return runWithRequestContext({ requestId: data.requestId ?? `job-${job.id}` }, async () => {
        const { salonId, provider } = data;
        log.info('Nightly diff started', { salonId, provider, jobId: job.id });

        const pf = container.providerFactory;
        const p = pf.make(provider);
        await p.init({ salonId, provider });

        await executeWithRetry(() => p.syncSalon({ salonId, provider }));
        await executeWithRetry(() => p.syncCategories({ salonId, provider }));
        await executeWithRetry(() => p.syncServices({ salonId, provider }));
        await executeWithRetry(() => p.syncWorkers({ salonId, provider }));

        log.info('Nightly diff completed', { salonId, provider, jobId: job.id });
      });
    },
    { connection: { url: REDIS_URL }, concurrency: 2 },
  );

  return worker;
}

