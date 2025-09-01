import { ICrmProvider, ProviderContext, CreateBookingInput, RescheduleBookingInput, CancelBookingInput } from './types';
import { CategoryData, ServiceData, WorkerData, WorkerSchedule, SalonData, Page } from './dtos';
import { TokenStorageService } from '@crm/token-storage';
import { AccountRegistryService } from '@crm/account-registry';
import { createChildLogger } from '@shared/logger';
import { CrmError, ErrorKind } from '@crm/shared';

export class EasyWeekProvider implements ICrmProvider {
  private log = createChildLogger('provider.easyweek');
  private apiKey?: string;
  private workspaceSlug?: string;
  private locationId?: string;

  constructor(
    private tokens: TokenStorageService,
    private accounts: AccountRegistryService,
  ) {}

  async init(ctx: ProviderContext): Promise<void> {
    // Secret from Token Storage
    const bundle = await this.tokens.get(ctx.salonId, ctx.provider);
    const apiKey = bundle?.apiKey;
    if (!apiKey) {
      throw new CrmError('Missing EasyWeek apiKey in Token Storage', { kind: ErrorKind.AUTH, retryable: false });
    }
    this.apiKey = apiKey;

    // Non-secrets from Account Registry
    const acc = await this.accounts.get(ctx.salonId, ctx.provider);
    const workspaceSlug = (acc?.data as any)?.workspaceSlug;
    const locationId = (acc?.data as any)?.locationId;
    if (!workspaceSlug || !locationId) {
      throw new CrmError('Missing EasyWeek workspaceSlug/locationId in Account Registry', { kind: ErrorKind.VALIDATION, retryable: false });
    }
    this.workspaceSlug = workspaceSlug;
    this.locationId = locationId;

    this.log.info('EasyWeek provider initialized', { salonId: ctx.salonId, workspaceSlug, locationId });
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
    this.log.warn('Stub method called', { method, workspaceSlug: this.workspaceSlug, locationId: this.locationId });
    throw new CrmError('Not implemented', { kind: ErrorKind.INTERNAL, retryable: false });
  }
}
