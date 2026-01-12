import { SERVICES_QUEUE, SyncJob } from '../../types';
import { ProviderFactory } from '@crm/provider-core';
import { executeWithRetry } from '@crm/retry-handler';
import { runWithRequestContext, createChildLogger } from '@shared/logger';

const log = createChildLogger('worker.services-sync');

export function startServicesSyncWorker(container: { providerFactory: ProviderFactory }) {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL is required');

  // Lazy require so tests can mock 'bullmq' without type deps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require('bullmq');

  const worker = new Worker(
    SERVICES_QUEUE,
    async (job: any) => {
    const data: SyncJob = job.data;
    return runWithRequestContext({ requestId: data.requestId ?? `job-${job.id}` }, async () => {
      const { salonId, provider } = data;
      log.info('Services sync started', { salonId, provider, jobId: job.id });

      const pf = container.providerFactory;
      const p = pf.make(provider);
      await p.init({ salonId, provider });

      try {
        const base = process.env.INTERNAL_API_BASE_URL;
        const key = process.env.INTERNAL_API_KEY;
        if (base && key) {
          const page = await executeWithRetry(() => p.pullServices());
          const services = (page?.items ?? []).map((s: any) => ({
            crm_service_id: String(s.externalId),
            category_external_id: s.categoryExternalId ?? undefined,
            name: String(s.name ?? ''),
            description: s.description ?? undefined,
            duration: s.duration ?? undefined,
            price: s.price ?? undefined,
            currency: s.currency ?? 'UAH',
            is_active: s.isActive ?? undefined,
            sort_order: s.sortOrder ?? 1,
            worker_ids: s.workerExternalIds ?? []
          }));
          await fetch(`${base}/api/v1/internal/services/sync`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-internal-key': key },
            body: JSON.stringify({ salon_id: salonId, services }),
          });
        } else {
          log.warn('Skip internal services sync: INTERNAL_API_BASE_URL or INTERNAL_API_KEY not set', { salonId, provider, jobId: job.id });
        }
      } catch (err) {
        log.warn('Failed to call internal services sync', { salonId, provider, jobId: job.id, error: (err as Error)?.message });
      }

      log.info('Services sync completed', { salonId, provider, jobId: job.id });
    });
  },
    { connection: { url: REDIS_URL }, concurrency: Math.max(1, Number.parseInt(process.env.CRM_WORKER_CONCURRENCY ?? '') || 1) },
  );

  worker.on('completed', (job: any) => log.info('Services job completed', { jobId: job.id }));
  worker.on('failed', (job: any, err: any) => log.warn('Services job failed', { jobId: job?.id, error: (err as Error)?.message }));

  return worker;
}
