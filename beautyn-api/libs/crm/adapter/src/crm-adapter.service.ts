import { Injectable } from '@nestjs/common';
import { CrmType, CrmError, ErrorKind } from '@crm/shared';
import { CapabilityRegistryService } from '@crm/capability-registry';
import { SyncSchedulerService } from '@crm/sync-scheduler';
import { ProviderFactory, CreateBookingInput, RescheduleBookingInput, CancelBookingInput, CategoryData, ServiceData, WorkerData, WorkerSchedule, SalonData } from '@crm/provider-core';
import { executeWithRetry, CircuitBreaker } from '@crm/retry-handler';
import { createChildLogger } from '@shared/logger';
import { ICrmAdapter } from './types';

type Op = 'create' | 'reschedule' | 'cancel' |
  'salon.update' |
  'category.create' | 'category.update' | 'category.delete' |
  'service.create' | 'service.update' | 'service.delete' |
  'worker.create' | 'worker.update' | 'worker.delete' | 'worker.updateSchedule';

@Injectable()
export class CrmAdapterService implements ICrmAdapter {
  private log = createChildLogger('crm.adapter');
  private breakers = new Map<string, CircuitBreaker>(); // key: provider:op

  constructor(
    private readonly caps: CapabilityRegistryService,
    private readonly scheduler: SyncSchedulerService,
    private readonly providers: ProviderFactory,
  ) {}

  async requestSync(salonId: string, provider: CrmType, requestId?: string): Promise<string> {
    this.log.info('Enqueue full sync', { salonId, provider });
    // Map to scheduler's full-sync job (previously "initial-sync")
    return this.scheduler.scheduleSync({ salonId, provider, requestId } as any);
  }

  async ensureCronSync(salonId: string, provider: CrmType, cron: string, tz?: string, requestId?: string): Promise<void> {
    this.log.info('Ensure CRON sync', { salonId, provider, cron, tz });
    // Map to scheduler's repeating diff job (accepts any cron, not just nightly)
    await this.scheduler.scheduleCronDiff({ salonId, provider, requestId, cron, tz } as any);
  }

  async createBooking(salonId: string, provider: CrmType, payload: CreateBookingInput) {
    this.caps.assert(provider, 'supportsBooking');
    return this.runOp('create', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.createBooking({ salonId, provider }, payload);
    });
  }

  async rescheduleBooking(salonId: string, provider: CrmType, payload: RescheduleBookingInput): Promise<void> {
    this.caps.assert(provider, 'supportsReschedule');
    await this.runOp('reschedule', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      await p.rescheduleBooking({ salonId, provider }, payload);
    });
  }

  async cancelBooking(salonId: string, provider: CrmType, payload: CancelBookingInput): Promise<void> {
    this.caps.assert(provider, 'supportsCancelBooking');
    await this.runOp('cancel', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      await p.cancelBooking({ salonId, provider }, payload);
    });
  }

  // ---- Master-data operations ----
  async updateSalon(salonId: string, provider: CrmType, patch: Partial<Omit<SalonData,'externalId'>>) {
    this.caps.assert(provider, 'supportsSalonUpdate');
    return this.runOp('salon.update', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.updateSalon({ salonId, provider }, patch);
    });
  }

  async createCategory(salonId: string, provider: CrmType, data: Omit<CategoryData,'externalId'|'updatedAtIso'> & { clientId?: string }) {
    this.caps.assert(provider, 'supportsCategoriesCreate');
    return this.runOp('category.create', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.createCategory({ salonId, provider }, data);
    });
  }
  async updateCategory(salonId: string, provider: CrmType, externalId: string, patch: Partial<Omit<CategoryData,'externalId'>>) {
    this.caps.assert(provider, 'supportsCategoriesUpdate');
    return this.runOp('category.update', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.updateCategory({ salonId, provider }, externalId, patch);
    });
  }
  async deleteCategory(salonId: string, provider: CrmType, externalId: string) {
    this.caps.assert(provider, 'supportsCategoriesDelete');
    return this.runOp('category.delete', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.deleteCategory({ salonId, provider }, externalId);
    });
  }

  async createService(salonId: string, provider: CrmType, data: Omit<ServiceData,'externalId'|'updatedAtIso'> & { clientId?: string }) {
    this.caps.assert(provider, 'supportsServicesCreate');
    return this.runOp('service.create', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.createService({ salonId, provider }, data);
    });
  }
  async updateService(salonId: string, provider: CrmType, externalId: string, patch: Partial<Omit<ServiceData,'externalId'>>) {
    this.caps.assert(provider, 'supportsServicesUpdate');
    return this.runOp('service.update', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.updateService({ salonId, provider }, externalId, patch);
    });
  }
  async deleteService(salonId: string, provider: CrmType, externalId: string) {
    this.caps.assert(provider, 'supportsServicesDelete');
    return this.runOp('service.delete', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.deleteService({ salonId, provider }, externalId);
    });
  }

  async createWorker(salonId: string, provider: CrmType, data: Omit<WorkerData,'externalId'|'updatedAtIso'> & { clientId?: string }) {
    this.caps.assert(provider, 'supportsWorkersCreate');
    return this.runOp('worker.create', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.createWorker({ salonId, provider }, data);
    });
  }
  async updateWorker(salonId: string, provider: CrmType, externalId: string, patch: Partial<Omit<WorkerData,'externalId'>>) {
    this.caps.assert(provider, 'supportsWorkersUpdate');
    return this.runOp('worker.update', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.updateWorker({ salonId, provider }, externalId, patch);
    });
  }
  async deleteWorker(salonId: string, provider: CrmType, externalId: string) {
    this.caps.assert(provider, 'supportsWorkersDelete');
    return this.runOp('worker.delete', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.deleteWorker({ salonId, provider }, externalId);
    });
  }
  async updateWorkerSchedule(salonId: string, provider: CrmType, externalId: string, schedule: WorkerSchedule) {
    this.caps.assert(provider, 'supportsWorkerScheduleUpdate');
    return this.runOp('worker.updateSchedule', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.updateWorkerSchedule({ salonId, provider }, externalId, schedule);
    });
  }

  // --- internals ---
  private breakerFor(provider: CrmType, op: Op) {
    const key = `${provider}:${op}`;
    let b = this.breakers.get(key);
    if (!b) {
      b = new CircuitBreaker(key, { failThreshold: 4, coolDownMs: 20_000, halfOpenMaxCalls: 1 });
      this.breakers.set(key, b);
    }
    return b;
  }

  private async runOp<T>(op: Op, salonId: string, provider: CrmType, fn: () => Promise<T>): Promise<T> {
    const breaker = this.breakerFor(provider, op);
    try {
      return await breaker.run(() =>
        executeWithRetry(fn, {
          onRetry: (e, attempt, next) =>
            this.log.warn('Retrying vendor call', {
              op, provider, salonId, attempt, nextDelayMs: next, error: String((e as any)?.message ?? e),
            }),
        })
      );
    } catch (e) {
      this.log.error('Adapter operation failed', { op, provider, salonId, error: String((e as any)?.message ?? e) });
      throw e instanceof CrmError
        ? e
        : new CrmError('Adapter operation failed', { kind: ErrorKind.INTERNAL, cause: e, retryable: false });
    }
  }
}

