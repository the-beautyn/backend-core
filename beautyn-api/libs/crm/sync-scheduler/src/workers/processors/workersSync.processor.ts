import { WORKERS_QUEUE, SyncJob } from '../../types';
import { ProviderFactory, WorkerData } from '@crm/provider-core';
import { executeWithRetry } from '@crm/retry-handler';
import { runWithRequestContext, createChildLogger } from '@shared/logger';

const log = createChildLogger('worker.workers-sync');

export function startWorkersSyncWorker(container: { providerFactory: ProviderFactory }) {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL is required');

  // Lazy import bullmq worker
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Worker } = require('bullmq');

  const worker = new Worker(
    WORKERS_QUEUE,
    async (job: any) => {
      const data: SyncJob = job.data;
      return runWithRequestContext({ requestId: data.requestId ?? `job-${job.id}` }, async () => {
        const { salonId, provider } = data;
        log.info('Workers sync started', { salonId, provider, jobId: job.id });

        const pf = container.providerFactory;
        const p = pf.make(provider);
        await p.init({ salonId, provider });

        try {
          const base = process.env.INTERNAL_API_BASE_URL;
          const key = process.env.INTERNAL_API_KEY;
          if (base && key) {
            const workers = await executeWithRetry(() => p.pullWorkers({ salonId, provider }));
            const payload = workers.map(mapWorkerForSync);
            await fetch(`${base}/api/v1/internal/workers/sync`, {
              method: 'POST',
              headers: { 'content-type': 'application/json', 'x-internal-key': key },
              body: JSON.stringify({ salonId, workers: payload }),
            });
          } else {
            log.warn('Skip internal workers sync: INTERNAL_API_BASE_URL or INTERNAL_API_KEY not set', { salonId, provider, jobId: job.id });
          }
        } catch (err) {
          log.warn('Failed to call internal workers sync', { salonId, provider, jobId: job.id, error: (err as Error)?.message });
        }

        log.info('Workers sync completed', { salonId, provider, jobId: job.id });
      });
    },
    { connection: { url: REDIS_URL }, concurrency: Math.max(1, Number.parseInt(process.env.CRM_WORKER_CONCURRENCY ?? '') || 1) },
  );

  worker.on('completed', (job: any) => log.info('Workers job completed', { jobId: job.id }));
  worker.on('failed', (job: any, err: any) => log.warn('Workers job failed', { jobId: job?.id, error: (err as Error)?.message }));

  return worker;
}

function mapWorkerForSync(worker: WorkerData) {
  const firstName = worker.firstName || deriveFirstName(worker.name);
  const lastName = worker.lastName || deriveLastName(worker.name);
  return {
    crmWorkerId: worker.externalId ?? null,
    firstName,
    lastName,
    position: worker.position ?? null,
    description: worker.description ?? null,
    email: worker.email ?? null,
    phone: worker.phone ?? null,
    photoUrl: worker.photoUrl ?? null,
    isActive: worker.isActive ?? true,
  };
}

function deriveFirstName(name?: string | null): string {
  if (!name) return 'Unknown';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[0] ?? 'Unknown';
}

function deriveLastName(name?: string | null): string {
  if (!name) return 'Worker';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return 'Worker';
  return parts.slice(1).join(' ');
}
