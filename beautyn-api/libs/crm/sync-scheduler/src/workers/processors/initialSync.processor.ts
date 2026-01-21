import { SYNC_QUEUE, SyncJob, JOB_SYNC } from '../../types';
import { ProviderFactory } from '@crm/provider-core';
import { executeWithRetry } from '@crm/retry-handler';
import { runWithRequestContext, createChildLogger } from '@shared/logger';
import { deriveFirstName, deriveLastName, resolveNamePart } from '@crm/shared';

const log = createChildLogger('worker.sync');

export function startInitialSyncWorker(container: { providerFactory: ProviderFactory }) {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL is required');

  // Lazy require so tests can mock 'bullmq' without type deps
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require('bullmq');

  const worker = new Worker(
    SYNC_QUEUE,
    async (job: any) => {
    const data: SyncJob = job.data;
    return runWithRequestContext({ requestId: data.requestId ?? `job-${job.id}` }, async () => {
      const { salonId, provider } = data;
      log.info('Initial sync started', { salonId, provider, jobId: job.id });

      const pf = container.providerFactory;
      const p = pf.make(provider);
      await p.init({ salonId, provider });

      const base = process.env.INTERNAL_API_BASE_URL;
      const key = process.env.INTERNAL_API_KEY;

      if (base && key) {
        // Salon
        try {
          const salon = await executeWithRetry(() => p.pullSalon());
          log.info('Pulled salon from CRM', { salonId, provider, jobId: job.id });
          await fetch(`${base}/api/v1/internal/salons/sync`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-internal-key': key },
            body: JSON.stringify({ salon_id: salonId, salon }),
          });
        } catch (err) {
          log.warn('Failed to call internal salon sync', { salonId, provider, jobId: job.id, error: (err as Error)?.message });
        }

        // Categories
        try {
          const page = await executeWithRetry(() => p.pullCategories());
          const categories = (page?.items ?? []).map((c: any) => ({
            crm_category_id: String(c.externalId),
            name: String(c.name ?? ''),
            color: c.color ?? undefined,
            sort_order: typeof c.sortOrder === 'number' ? c.sortOrder : undefined,
          }));
          log.info('Pulled categories from CRM', { salonId, provider, jobId: job.id, count: categories.length });
          await fetch(`${base}/api/v1/internal/categories/sync`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-internal-key': key },
            body: JSON.stringify({ salon_id: salonId, categories }),
          });
        } catch (err) {
          log.warn('Failed to call internal categories sync', { salonId, provider, jobId: job.id, error: (err as Error)?.message });
        }

        // Services
        try {
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
            sort_order: typeof s.sortOrder === 'number' ? s.sortOrder : undefined,
            worker_ids: Array.isArray(s.workerExternalIds) ? s.workerExternalIds.map((id: any) => String(id)) : [],
          }));
          log.info('Pulled services from CRM', { salonId, provider, jobId: job.id, count: services.length });
          await fetch(`${base}/api/v1/internal/services/sync`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-internal-key': key },
            body: JSON.stringify({ salon_id: salonId, services }),
          });
        } catch (err) {
          log.warn('Failed to call internal services sync', { salonId, provider, jobId: job.id, error: (err as Error)?.message });
        }

        // Workers
        try {
          const workers = await executeWithRetry(() => p.pullWorkers());
          const payload = (workers?.items ?? []).map(toWorkerPayload);
          log.info('Pulled workers from CRM', { salonId, provider, jobId: job.id, count: payload.length });
          await fetch(`${base}/api/v1/internal/workers/sync`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-internal-key': key },
            body: JSON.stringify({ salonId, workers: payload }),
          });
        } catch (err) {
          log.warn('Failed to call internal workers sync', { salonId, provider, jobId: job.id, error: (err as Error)?.message });
        }
      } else {
        log.warn('Skip initial sync internal calls: INTERNAL_API_BASE_URL or INTERNAL_API_KEY not set', { salonId, provider, jobId: job.id });
      }

      log.info('Initial sync completed', { salonId, provider, jobId: job.id });
    });
  },
    { connection: { url: REDIS_URL }, concurrency: Math.max(1, Number.parseInt(process.env.CRM_WORKER_CONCURRENCY ?? '') || 1) },
  );

  worker.on('completed', (job: any) => log.info('Initial job completed', { jobId: job.id }));
  worker.on('failed', (job: any, err: any) => log.warn('Initial job failed', { jobId: job?.id, error: (err as Error)?.message }));

  return worker;
}

function toWorkerPayload(worker: any) {
  const firstName = resolveNamePart(worker?.firstName, deriveFirstName(worker?.name));
  const lastName = resolveNamePart(worker?.lastName, deriveLastName(worker?.name));
  return {
    crmWorkerId: worker?.externalId ?? null,
    firstName,
    lastName,
    position: worker?.position ?? null,
    description: worker?.description ?? null,
    email: worker?.email ?? null,
    phone: worker?.phone ?? null,
    photoUrl: worker?.photoUrl ?? null,
    isActive: worker?.isActive ?? true,
  };
}

// removed local helpers in favor of shared '@crm/shared' names helpers
