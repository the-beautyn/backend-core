import { Injectable } from '@nestjs/common';
import { CrmType, CrmError, ErrorKind } from '@crm/shared';
import { CapabilityRegistryService } from '@crm/capability-registry';
import { SyncSchedulerService } from '@crm/sync-scheduler';
import { ProviderFactory, CreateBookingInput, RescheduleBookingInput, CancelBookingInput } from '@crm/provider-core';
import { executeWithRetry, CircuitBreaker } from '@crm/retry-handler';
import { createChildLogger } from '@shared/logger';
import { ICrmAdapter } from './types';

type Op = 'create' | 'reschedule' | 'cancel';

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

