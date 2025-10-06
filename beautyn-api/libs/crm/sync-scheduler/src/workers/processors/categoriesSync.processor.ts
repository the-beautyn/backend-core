import { CATEGORIES_QUEUE, SyncJob } from '../../types';
import { ProviderFactory } from '@crm/provider-core';
import { executeWithRetry } from '@crm/retry-handler';
import { runWithRequestContext, createChildLogger } from '@shared/logger';

const log = createChildLogger('worker.categories-sync');

export function startCategoriesSyncWorker(container: { providerFactory: ProviderFactory }) {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL is required');

  // Lazy require so tests can mock 'bullmq' without type deps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require('bullmq');

  const worker = new Worker(
    CATEGORIES_QUEUE,
    async (job: any) => {
    const data: SyncJob = job.data;
    return runWithRequestContext({ requestId: data.requestId ?? `job-${job.id}` }, async () => {
      const { salonId, provider } = data;
      log.info('Categories sync started', { salonId, provider, jobId: job.id });

      const pf = container.providerFactory;
      const p = pf.make(provider);
      await p.init({ salonId, provider });

      try {
        const base = process.env.INTERNAL_API_BASE_URL;
        const key = process.env.INTERNAL_API_KEY;
        if (base && key) {
          const page = await executeWithRetry(() => p.pullCategories({ salonId, provider }));
          const items = (page?.items ?? []).map((c: any) => ({
            crm_category_id: String(c.externalId),
            name: String(c.name ?? ''),
            color: c.color ?? undefined,
            sort_order: typeof c.sortOrder === 'number' ? c.sortOrder : undefined,
          }));
          log.info('Pulled categories from CRM', { salonId, provider, jobId: job.id, categories: items });
          await fetch(`${base}/api/v1/internal/categories/sync`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-internal-key': key },
            body: JSON.stringify({ salon_id: salonId, categories: items }),
          });
        } else {
          log.warn('Skip internal categories sync: INTERNAL_API_BASE_URL or INTERNAL_API_KEY not set', { salonId, provider, jobId: job.id });
        }
      } catch (err) {
        log.warn('Failed to call internal categories sync', { salonId, provider, jobId: job.id, error: (err as Error)?.message });
      }

      log.info('Categories sync completed', { salonId, provider, jobId: job.id });
    });
  },
    { connection: { url: REDIS_URL }, concurrency: Math.max(1, Number.parseInt(process.env.CRM_WORKER_CONCURRENCY ?? '') || 1) },
  );

  worker.on('completed', (job: any) => log.info('Categories job completed', { jobId: job.id }));
  worker.on('failed', (job: any, err: any) => log.warn('Categories job failed', { jobId: job?.id, error: (err as Error)?.message }));

  return worker;
}
