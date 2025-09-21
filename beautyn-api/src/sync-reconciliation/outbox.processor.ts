import { Worker, Job } from 'bullmq';
import { createChildLogger, runWithRequestContext } from '@shared/logger';
import { executeWithRetry } from '@crm/retry-handler';
import { CrmAdapterService } from '@crm/adapter';
import { OutboxRepository } from './outbox.repository';
import { MappingRepository } from './mapping.repository';
import { IntentOp } from './types';

const log = createChildLogger('outbox.worker');

type IntentJob = { intentId: string; requestId?: string };

export function startOutboxWorker(container: { repo: OutboxRepository; mapper: MappingRepository; adapter: CrmAdapterService }) {
  const { REDIS_URL } = process.env;
  if (!REDIS_URL) throw new Error('REDIS_URL required');

  const worker = new Worker<IntentJob>('crm-outbox', async (job: Job<IntentJob>) => {
    return runWithRequestContext({ requestId: job.data.requestId ?? `obx-${job.id}` }, async () => {
      const repo = container.repo; const map = container.mapper; const adapter = container.adapter;
      const row = await repo.getById(job.data.intentId);
      if (!row) return;

      await repo.markRunning(row.id);
      const { salonId, provider, entityType, entityId, op, payload } = row;
      log.info('Delivering intent', { intentId: row.id, entityType, op });

      const withRetry = <T>(fn: () => Promise<T>) => executeWithRetry(fn, {});

      // try {
      //   switch (op as IntentOp) {
      //     case 'create': {
      //       // Create returns externalId → record mapping
      //       if (entityType === 'category') {
      //         const res = await withRetry(() => adapter.createCategory(salonId, provider as any, payload));
      //         await map.setExternalId('category', entityId, provider, res.externalId);
      //       } else if (entityType === 'service') {
      //         const res = await withRetry(() => adapter.createService(salonId, provider as any, payload));
      //         await map.setExternalId('service', entityId, provider, res.externalId);
      //       } else if (entityType === 'worker') {
      //         const res = await withRetry(() => adapter.createWorker(salonId, provider as any, payload));
      //         await map.setExternalId('worker', entityId, provider, res.externalId);
      //       } else if (entityType === 'salon') {
      //         await withRetry(() => adapter.updateSalon(salonId, provider as any, payload)); // salon has no create in CRM
      //       }
      //       break;
      //     }
      //     case 'update': {
      //       const externalId =
      //         entityType === 'salon' ? undefined :
      //         await map.getExternalId(entityType as any, entityId, provider);
      //       if (entityType === 'category') await withRetry(() => adapter.updateCategory(salonId, provider as any, externalId!, payload));
      //       if (entityType === 'service')  await withRetry(() => adapter.updateService(salonId, provider as any, externalId!, payload));
      //       if (entityType === 'worker')   await withRetry(() => adapter.updateWorker (salonId, provider as any, externalId!, payload));
      //       if (entityType === 'salon')    await withRetry(() => adapter.updateSalon (salonId, provider as any, payload));
      //       break;
      //     }
      //     case 'delete': {
      //       const externalId = await map.getExternalId(entityType as any, entityId, provider);
      //       if (!externalId) break; // idempotent
      //       if (entityType === 'category') await withRetry(() => adapter.deleteCategory(salonId, provider as any, externalId));
      //       if (entityType === 'service')  await withRetry(() => adapter.deleteService(salonId, provider as any, externalId));
      //       if (entityType === 'worker')   await withRetry(() => adapter.deleteWorker (salonId, provider as any, externalId));
      //       await map.deleteMapping(entityType as any, entityId, provider);
      //       break;
      //     }
      //     case 'updateSchedule': {
      //       const externalId = await map.getExternalId('worker', entityId, provider);
      //       if (externalId) await withRetry(() => adapter.updateWorkerSchedule(salonId, provider as any, externalId, payload));
      //       break;
      //     }
      //     default: break;
      //   }

      //   await repo.markDelivered(row.id);
      //   log.info('Intent delivered', { intentId: row.id });
      // } catch (e: any) {
      //   const attempts = (row.attempts ?? 0) + 1;
      //   const nextMs = Math.min(30 * 60_000, 60_000 * Math.pow(2, attempts - 1));
      //   const nextRunAt = new Date(Date.now() + nextMs).toISOString();
      //   await repo.markError(row.id, String(e?.message ?? e), nextRunAt);
      //   log.warn('Intent deferred', { intentId: row.id, attempts, nextRunAt, error: String(e?.message ?? e) });
      // }
    });
  }, { connection: { url: REDIS_URL }, concurrency: 2 });

  return worker;
}

