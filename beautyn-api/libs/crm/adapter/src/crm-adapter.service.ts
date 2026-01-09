import { Injectable } from '@nestjs/common';
import { CrmType, CrmError, ErrorKind } from '@crm/shared';
import { CapabilityRegistryService } from '@crm/capability-registry';
import { SyncSchedulerService } from '@crm/sync-scheduler';
import { ProviderFactory, CategoryData, CategoryCreateInput, CategoryUpdateInput, ServiceData, ServiceCreateInput, ServiceUpdateInput, WorkerData, WorkerCreateInput, WorkerUpdateInput, SalonData, Page, BookingData, AltegioProvider, AltegioCreateRecordPayload, EasyWeekProvider, EasyWeekBooking } from '@crm/provider-core';
import type { AltegioBooking } from '@crm/provider-core/altegio/bookings';
import { executeWithRetry, CircuitBreaker } from '@crm/retry-handler';
import { createChildLogger } from '@shared/logger';

type Op = 'booking.create' | 'booking.reschedule' | 'booking.cancel' | 'booking.complete' | 'booking.detail' | 'availability.get' |
  'salon.update' |
  'category.create' | 'category.update' | 'category.delete' |
  'service.create' | 'service.update' | 'service.delete' |
  'worker.create' | 'worker.update' | 'worker.delete' | 'worker.updateSchedule' | 'booking.list' | 'booking.sync' |
  'pull.salon' | 'pull.categories' | 'pull.services' | 'pull.workers' | 'sync.categories' |
  'book.services' | 'book.staff' | 'book.dates' | 'book.times' | 'book.create';

@Injectable()
export class CrmAdapterService {
  private log = createChildLogger('crm.adapter');
  private breakers = new Map<string, CircuitBreaker>(); // key: provider:op

  constructor(
    private readonly caps: CapabilityRegistryService,
    private readonly scheduler: SyncSchedulerService,
    private readonly providers: ProviderFactory,
  ) {}
  // ---- booking flow ----
  async bookServices(
    salonId: string,
    provider: CrmType,
    args?: { serviceIds?: number[]; staffId?: number },
  ) {
    this.caps.assert(provider, 'supportsBookingServicesPull');
    return this.runOp('book.services', salonId, provider, async () => {
      const p = this.providers.make(provider) as AltegioProvider;
      await p.init({ salonId, provider });
      return p.getBookServices(args);
    });
  }

  async bookStaff(
    salonId: string,
    provider: CrmType,
    args?: { serviceIds?: number[]; datetime?: string },
  ) {
    this.caps.assert(provider, 'supportsBookingWorkersPull');
    return this.runOp('book.staff', salonId, provider, async () => {
      const p = this.providers.make(provider) as AltegioProvider;
      await p.init({ salonId, provider });
      return p.getBookStaff(args);
    });
  }

  async bookDates(
    salonId: string,
    provider: CrmType,
    args?: { serviceIds?: number[]; staffId?: number; dateFrom?: string; dateTo?: string },
  ) {
    this.caps.assert(provider, 'supportsBookingDatesPull');
    return this.runOp('book.dates', salonId, provider, async () => {
      const p = this.providers.make(provider) as AltegioProvider;
      await p.init({ salonId, provider });
      return p.getBookDates(args);
    });
  }

  async bookTimes(
    salonId: string,
    provider: CrmType,
    args: { staffId: number; date: string; serviceIds?: number[] },
  ) {
    this.caps.assert(provider, 'supportsBookingTimeslotsPull');
    return this.runOp('book.times', salonId, provider, async () => {
      const p = this.providers.make(provider) as AltegioProvider;
      await p.init({ salonId, provider });
      return p.getBookTimes(args);
    });
  }

  async createRecord(
    salonId: string,
    provider: CrmType,
    payload: AltegioCreateRecordPayload,
  ) {
    this.caps.assert(provider, 'supportsBookingCreate');
    return this.runOp('book.create', salonId, provider, async () => {
      const p = this.providers.make(provider) as AltegioProvider;
      await p.init({ salonId, provider });
      return p.createRecord(payload);
    });
  }

  async fetchEasyWeekBookingDetails(salonId: string, bookingUuid: string): Promise<EasyWeekBooking> {
    const provider = CrmType.EASYWEEK;
    this.caps.assert(provider, 'supportsBooking');
    return this.runOp('booking.detail', salonId, provider, async () => {
      const p = this.providers.make(provider) as EasyWeekProvider;
      await p.init({ salonId, provider });
      return p.fetchBooking(bookingUuid);
    });
  }

  // ---- Booking operations ----
  async pullAltegioBookings(
    salonId: string,
    bookingIds: string[]
  ): Promise<Page<AltegioBooking>> {
    const provider = CrmType.ALTEGIO;
    this.caps.assert(provider, 'supportsBookingSync');
    return this.runOp('booking.list', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.pullAltegioBookings(bookingIds);
    });
  }

  async pullEasyweekBookings(
    salonId: string,
    bookingIds: string[]
  ): Promise<Page<EasyWeekBooking>> {
    const provider = CrmType.EASYWEEK;
    this.caps.assert(provider, 'supportsBookingSync');
    return this.runOp('booking.list', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.pullEasyWeekBookings(bookingIds);
    });
  }

  // ---- Onboarding pulls ----
  async pullSalon(salonId: string, provider: CrmType): Promise<SalonData> {
    this.caps.assert(provider, 'supportsSalonSync');
    return this.runOp('pull.salon', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.pullSalon();
    });
  }

  // ---- Category operations ----
  async pullCategories(salonId: string, provider: CrmType): Promise<Page<CategoryData>> {
    this.caps.assert(provider, 'supportsCategoriesSync');
    return this.runOp('pull.categories', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.pullCategories();
    });
  }

  async createCategory(
    salonId: string,
    provider: CrmType,
    data: CategoryCreateInput,
  ): Promise<CategoryData> {
    this.caps.assert(provider, 'supportsCategoriesCreate');
    return this.runOp('category.create', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.createCategory(data);
    });
  }

  async updateCategory(
    salonId: string,
    provider: CrmType,
    externalId: string,
    patch: CategoryUpdateInput,
  ): Promise<CategoryData> {
    this.caps.assert(provider, 'supportsCategoriesUpdate');
    return this.runOp('category.update', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.updateCategory(externalId, patch);
    });
  }

  async deleteCategory(salonId: string, provider: CrmType, externalId: string): Promise<void> {
    this.caps.assert(provider, 'supportsCategoriesDelete');
    await this.runOp('category.delete', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      await p.deleteCategory(externalId);
    });
  }

  // ---- Service operations ----
  async pullServices(salonId: string, provider: CrmType): Promise<Page<ServiceData>> {
    this.caps.assert(provider, 'supportsServicesSync');
    return this.runOp('pull.services', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.pullServices();
    });
  }

  async createService(salonId: string, provider: CrmType, data: ServiceCreateInput): Promise<ServiceData> {
    this.caps.assert(provider, 'supportsServicesCreate');
    return this.runOp('service.create', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.createService(data);
    });
  }

  async updateService(
    salonId: string,
    provider: CrmType,
    externalId: string,
    patch: ServiceUpdateInput,
  ): Promise<ServiceData> {
    this.caps.assert(provider, 'supportsServicesUpdate');
    return this.runOp('service.update', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.updateService(externalId, patch);
    });
  }

  async deleteService(salonId: string, provider: CrmType, externalId: string): Promise<void> {
    this.caps.assert(provider, 'supportsServicesDelete');
    await this.runOp('service.delete', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      await p.deleteService(externalId);
    });
  }

  // ---- Workers operations ----
  async pullWorkers(salonId: string, provider: CrmType): Promise<Page<WorkerData>> {
    this.caps.assert(provider, 'supportsWorkersPull');
    return this.runOp('pull.workers', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.pullWorkers();
    });
  }

  async createWorker(salonId: string, provider: CrmType, data: WorkerCreateInput): Promise<WorkerData> {
    this.caps.assert(provider, 'supportsWorkersCreate');
    return this.runOp('worker.create', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.createWorker(data);
    });
  }

  async updateWorker(salonId: string, provider: CrmType, externalId: string, patch: WorkerUpdateInput): Promise<WorkerData> {
    this.caps.assert(provider, 'supportsWorkersUpdate');
    return this.runOp('worker.update', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      return p.updateWorker(externalId, patch);
    });
  }

  async deleteWorker(salonId: string, provider: CrmType, externalId: string): Promise<void> {
    this.caps.assert(provider, 'supportsWorkersDelete');
    await this.runOp('worker.delete', salonId, provider, async () => {
      const p = this.providers.make(provider);
      await p.init({ salonId, provider });
      await p.deleteWorker(externalId);
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
