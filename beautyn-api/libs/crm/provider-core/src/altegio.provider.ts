import { ICrmProvider, ProviderContext, CreateBookingInput, RescheduleBookingInput, CancelBookingInput } from './types';
import { CategoryData, ServiceData, WorkerData, WorkerSchedule, SalonData, Page } from './dtos';
import { AccountRegistryService } from '@crm/account-registry';
import { createChildLogger } from '@shared/logger';
import { CrmError, ErrorKind } from '@crm/shared';

export class AltegioProvider implements ICrmProvider {
  private log = createChildLogger('provider.altegio');
  private externalSalonId?: number;

  constructor(private accounts: AccountRegistryService) {}

  async init(ctx: ProviderContext): Promise<void> {
    // Read non-secret account data
    const acc = await this.accounts.get(ctx.salonId, ctx.provider);
    const externalSalonId = (acc?.data as any)?.externalSalonId;
    if (typeof externalSalonId !== 'number') {
      throw new CrmError('Missing Altegio externalSalonId in Account Registry', { kind: ErrorKind.VALIDATION, retryable: false });
    }
    this.externalSalonId = externalSalonId;

    // Tokens come from env (not stored in DB)
    const bearer = process.env.ALTEGIO_BEARER;
    const user = process.env.ALTEGIO_USER;
    if (!bearer || !user) {
      throw new CrmError('Missing ALTEGIO_BEARER or ALTEGIO_USER env variables', { kind: ErrorKind.AUTH, retryable: false });
    }
    this.log.info('Altegio provider initialized', { salonId: ctx.salonId, externalSalonId });
  }

  async syncSalon(ctx: ProviderContext): Promise<void> { this.notYet('syncSalon'); }
  async syncCategories(ctx: ProviderContext): Promise<void> { this.notYet('syncCategories'); }
  async syncServices(ctx: ProviderContext): Promise<void> { this.notYet('syncServices'); }
  async syncWorkers(ctx: ProviderContext): Promise<void> { this.notYet('syncWorkers'); }

  // Normalized pull (stubs)
  async pullSalon(ctx: ProviderContext): Promise<SalonData> { this.notYet('pullSalon'); }
  async pullCategories(ctx: ProviderContext, cursor?: string): Promise<Page<CategoryData>> { this.notYet('pullCategories'); }
  async pullServices(ctx: ProviderContext, cursor?: string): Promise<Page<ServiceData>> { this.notYet('pullServices'); }
  async pullWorkers(ctx: ProviderContext, cursor?: string): Promise<Page<WorkerData>> { this.notYet('pullWorkers'); }

  async createBooking(ctx: ProviderContext, payload: CreateBookingInput): Promise<{ externalBookingId: string }> {
    this.notYet('createBooking'); return { externalBookingId: '' };
  }
  async rescheduleBooking(ctx: ProviderContext, payload: RescheduleBookingInput): Promise<void> { this.notYet('rescheduleBooking'); }
  async cancelBooking(ctx: ProviderContext, payload: CancelBookingInput): Promise<void> { this.notYet('cancelBooking'); }

  // CRUD stubs
  async updateSalon(ctx: ProviderContext, patch: Partial<Omit<SalonData, 'externalId'>>): Promise<void> { this.notYet('updateSalon'); }

  async createCategory(ctx: ProviderContext, data: Omit<CategoryData, 'externalId' | 'updatedAtIso'> & { clientId?: string }): Promise<{ externalId: string }> { this.notYet('createCategory'); }
  async updateCategory(ctx: ProviderContext, externalId: string, patch: Partial<Omit<CategoryData, 'externalId'>>): Promise<void> { this.notYet('updateCategory'); }
  async deleteCategory(ctx: ProviderContext, externalId: string): Promise<void> { this.notYet('deleteCategory'); }

  async createService(ctx: ProviderContext, data: Omit<ServiceData, 'externalId' | 'updatedAtIso'> & { clientId?: string }): Promise<{ externalId: string }> { this.notYet('createService'); }
  async updateService(ctx: ProviderContext, externalId: string, patch: Partial<Omit<ServiceData, 'externalId'>>): Promise<void> { this.notYet('updateService'); }
  async deleteService(ctx: ProviderContext, externalId: string): Promise<void> { this.notYet('deleteService'); }

  async createWorker(ctx: ProviderContext, data: Omit<WorkerData, 'externalId' | 'updatedAtIso'> & { clientId?: string }): Promise<{ externalId: string }> { this.notYet('createWorker'); }
  async updateWorker(ctx: ProviderContext, externalId: string, patch: Partial<Omit<WorkerData, 'externalId'>>): Promise<void> { this.notYet('updateWorker'); }
  async deleteWorker(ctx: ProviderContext, externalId: string): Promise<void> { this.notYet('deleteWorker'); }
  async updateWorkerSchedule(ctx: ProviderContext, externalId: string, schedule: WorkerSchedule): Promise<void> { this.notYet('updateWorkerSchedule'); }

  private notYet(method: string): never {
    this.log.warn('Stub method called', { method, externalSalonId: this.externalSalonId });
    throw new CrmError('Not implemented', { kind: ErrorKind.INTERNAL, retryable: false });
  }
}
