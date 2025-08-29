import { ICrmProvider, ProviderContext, CreateBookingInput, RescheduleBookingInput, CancelBookingInput } from './types';
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

  async createBooking(ctx: ProviderContext, payload: CreateBookingInput): Promise<{ externalBookingId: string }> {
    this.notYet('createBooking'); return { externalBookingId: '' };
  }
  async rescheduleBooking(ctx: ProviderContext, payload: RescheduleBookingInput): Promise<void> { this.notYet('rescheduleBooking'); }
  async cancelBooking(ctx: ProviderContext, payload: CancelBookingInput): Promise<void> { this.notYet('cancelBooking'); }

  private notYet(method: string): never {
    this.log.warn('Stub method called', { method, workspaceSlug: this.workspaceSlug, locationId: this.locationId });
    throw new CrmError('Not implemented', { kind: ErrorKind.INTERNAL, retryable: false });
  }
}

