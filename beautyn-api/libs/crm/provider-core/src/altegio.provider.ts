import { ICrmProvider, ProviderContext, CreateBookingInput, RescheduleBookingInput, CancelBookingInput } from './types';
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

  async createBooking(ctx: ProviderContext, payload: CreateBookingInput): Promise<{ externalBookingId: string }> {
    this.notYet('createBooking'); return { externalBookingId: '' };
  }
  async rescheduleBooking(ctx: ProviderContext, payload: RescheduleBookingInput): Promise<void> { this.notYet('rescheduleBooking'); }
  async cancelBooking(ctx: ProviderContext, payload: CancelBookingInput): Promise<void> { this.notYet('cancelBooking'); }

  private notYet(method: string): never {
    this.log.warn('Stub method called', { method, externalSalonId: this.externalSalonId });
    throw new CrmError('Not implemented', { kind: ErrorKind.INTERNAL, retryable: false });
  }
}

