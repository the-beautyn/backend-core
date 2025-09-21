import { Injectable } from '@nestjs/common';
import { CrmType, CrmError, ErrorKind } from '@crm/shared';
import { CapabilityRegistryService } from '@crm/capability-registry';
import { SyncSchedulerService } from '@crm/sync-scheduler';
import { ProviderFactory, CreateBookingInput, RescheduleBookingInput, CancelBookingInput, CategoryData, ServiceData, WorkerData, WorkerSchedule, SalonData, GetAvailabilityInput, CompleteBookingInput, Page, BookingData } from '@crm/provider-core';
import { executeWithRetry, CircuitBreaker } from '@crm/retry-handler';
import { createChildLogger } from '@shared/logger';
import { ICrmAdapter } from './types';

type Op = 'booking.create' | 'booking.reschedule' | 'booking.cancel' | 'booking.complete' | 'availability.get' |
  'salon.update' |
  'category.create' | 'category.update' | 'category.delete' |
  'service.create' | 'service.update' | 'service.delete' |
  'worker.create' | 'worker.update' | 'worker.delete' | 'worker.updateSchedule' | 'booking.list' |
  'pull.salon' | 'pull.categories' | 'pull.services' | 'pull.workers';

@Injectable()
export class CrmAdapterService implements ICrmAdapter {
  private log = createChildLogger('crm.adapter');
  private breakers = new Map<string, CircuitBreaker>(); // key: provider:op

  constructor(
    private readonly caps: CapabilityRegistryService,
    private readonly scheduler: SyncSchedulerService,
    private readonly providers: ProviderFactory,
  ) {}

  // async requestSync(salonId: string, provider: CrmType, requestId?: string): Promise<string> {
  //   this.log.info('Enqueue full sync', { salonId, provider });
  //   // Map to scheduler's full-sync job (previously "initial-sync")
  //   return this.scheduler.scheduleSync({ salonId, provider, requestId } as any);
  // }

  // async ensureCronSync(salonId: string, provider: CrmType, cron: string, tz?: string, requestId?: string): Promise<void> {
  //   this.log.info('Ensure CRON sync', { salonId, provider, cron, tz });
  //   // Map to scheduler's repeating diff job (accepts any cron, not just nightly)
  //   await this.scheduler.scheduleCronDiff({ salonId, provider, requestId, cron, tz } as any);
  // }

  // async createBooking(salonId: string, provider: CrmType, payload: CreateBookingInput) {
  //   this.caps.assert(provider, 'supportsBooking');
  //   return this.runOp('booking.create', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.createBooking({ salonId, provider }, payload);
  //   });
  // }

  // async rescheduleBooking(salonId: string, provider: CrmType, payload: RescheduleBookingInput): Promise<void> {
  //   this.caps.assert(provider, 'supportsReschedule');
  //   await this.runOp('booking.reschedule', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     await p.rescheduleBooking({ salonId, provider }, payload);
  //   });
  // }

  // async cancelBooking(salonId: string, provider: CrmType, payload: CancelBookingInput): Promise<void> {
  //   this.caps.assert(provider, 'supportsCancelBooking');
  //   await this.runOp('booking.cancel', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     await p.cancelBooking({ salonId, provider }, payload);
  //   });
  // }

  // async completeBooking(salonId: string, provider: CrmType, payload: CompleteBookingInput): Promise<void> {
  //   this.caps.assert(provider, 'supportsBooking');
  //   await this.runOp('booking.complete', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     await p.completeBooking({ salonId, provider }, payload);
  //   });
  // }

  // async getAvailability(salonId: string, provider: CrmType, input: GetAvailabilityInput): Promise<{ slots: Array<{ startIso: string; endIso: string; priceMinor?: number; quantity?: number }>; timezone?: string; currency?: string }> {
  //   return this.runOp('availability.get', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.getAvailability({ salonId, provider }, input);
  //   });
  // }

  // ---- Onboarding pulls ----
  async pullSalon(salonId: string, provider: CrmType): Promise<SalonData> {
    this.caps.assert(provider, 'supportsSalonSync');
    return this.runOp('pull.salon', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.pullSalon({ salonId, provider });
    });
  }

  async pullBookings(
    salonId: string,
    provider: CrmType,
    args?: { clientExternalId?: string; withDeleted?: boolean; startDate?: string; endDate?: string; page?: number; count?: number }
  ): Promise<BookingData[]> {
    this.caps.assert(provider, 'supportsBooking');
    return this.runOp('booking.list', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.pullBookings({ salonId, provider }, args);
    });
  }

  // async pullCategories(salonId: string, provider: CrmType, cursor?: string): Promise<Page<CategoryData>> {
  //   this.caps.assert(provider, 'supportsCategoriesSync');
  //   return this.runOp('pull.categories', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.pullCategories({ salonId, provider }, cursor);
  //   });
  // }

  // async pullServices(salonId: string, provider: CrmType, cursor?: string): Promise<Page<ServiceData>> {
  //   this.caps.assert(provider, 'supportsServicesSync');
  //   return this.runOp('pull.services', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.pullServices({ salonId, provider }, cursor);
  //   });
  // }

  // async pullWorkers(salonId: string, provider: CrmType, cursor?: string): Promise<Page<WorkerData>> {
  //   this.caps.assert(provider, 'supportsWorkersSync');
  //   return this.runOp('pull.workers', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.pullWorkers({ salonId, provider }, cursor);
  //   });
  // }

  // // ---- Master-data operations ----
  // async updateSalon(salonId: string, provider: CrmType, patch: Partial<Omit<SalonData,'externalId'>>) {
  //   this.caps.assert(provider, 'supportsSalonUpdate');
  //   return this.runOp('salon.update', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.updateSalon({ salonId, provider }, patch);
  //   });
  // }

  // async createCategory(salonId: string, provider: CrmType, data: Omit<CategoryData,'externalId'|'updatedAtIso'> & { clientId?: string }) {
  //   this.caps.assert(provider, 'supportsCategoriesCreate');
  //   return this.runOp('category.create', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.createCategory({ salonId, provider }, data);
  //   });
  // }
  // async updateCategory(salonId: string, provider: CrmType, externalId: string, patch: Partial<Omit<CategoryData,'externalId'>>) {
  //   this.caps.assert(provider, 'supportsCategoriesUpdate');
  //   return this.runOp('category.update', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.updateCategory({ salonId, provider }, externalId, patch);
  //   });
  // }
  // async deleteCategory(salonId: string, provider: CrmType, externalId: string) {
  //   this.caps.assert(provider, 'supportsCategoriesDelete');
  //   return this.runOp('category.delete', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.deleteCategory({ salonId, provider }, externalId);
  //   });
  // }

  // async createService(salonId: string, provider: CrmType, data: Omit<ServiceData,'externalId'|'updatedAtIso'> & { clientId?: string }) {
  //   this.caps.assert(provider, 'supportsServicesCreate');
  //   return this.runOp('service.create', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.createService({ salonId, provider }, data);
  //   });
  // }
  // async updateService(salonId: string, provider: CrmType, externalId: string, patch: Partial<Omit<ServiceData,'externalId'>>) {
  //   this.caps.assert(provider, 'supportsServicesUpdate');
  //   return this.runOp('service.update', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.updateService({ salonId, provider }, externalId, patch);
  //   });
  // }
  // async deleteService(salonId: string, provider: CrmType, externalId: string) {
  //   this.caps.assert(provider, 'supportsServicesDelete');
  //   return this.runOp('service.delete', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.deleteService({ salonId, provider }, externalId);
  //   });
  // }

  // async createWorker(salonId: string, provider: CrmType, data: Omit<WorkerData,'externalId'|'updatedAtIso'> & { clientId?: string }) {
  //   this.caps.assert(provider, 'supportsWorkersCreate');
  //   return this.runOp('worker.create', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.createWorker({ salonId, provider }, data);
  //   });
  // }
  // async updateWorker(salonId: string, provider: CrmType, externalId: string, patch: Partial<Omit<WorkerData,'externalId'>>) {
  //   this.caps.assert(provider, 'supportsWorkersUpdate');
  //   return this.runOp('worker.update', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.updateWorker({ salonId, provider }, externalId, patch);
  //   });
  // }
  // async deleteWorker(salonId: string, provider: CrmType, externalId: string) {
  //   this.caps.assert(provider, 'supportsWorkersDelete');
  //   return this.runOp('worker.delete', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.deleteWorker({ salonId, provider }, externalId);
  //   });
  // }
  // async updateWorkerSchedule(salonId: string, provider: CrmType, externalId: string, schedule: WorkerSchedule) {
  //   this.caps.assert(provider, 'supportsWorkerScheduleUpdate');
  //   return this.runOp('worker.updateSchedule', salonId, provider, async () => {
  //     const p = this.providers.make(provider);
  //     await p.init({ salonId, provider });
  //     return p.updateWorkerSchedule({ salonId, provider }, externalId, schedule);
  //   });
  // }

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
