import { Injectable } from '@nestjs/common';
import { CrmType } from '@crm/shared';
import { CapabilityRegistryService } from '@crm/capability-registry';
import { TokenStorageService } from '@crm/token-storage';
import { AccountRegistryService } from '@crm/account-registry';
import { ICrmProvider } from './types';
import { AltegioProvider } from './altegio.provider';
import { EasyWeekProvider } from './easyweek.provider';

@Injectable()
export class ProviderFactory {
  constructor(
    private readonly caps: CapabilityRegistryService,
    private readonly tokens: TokenStorageService,
    private readonly accounts: AccountRegistryService,
  ) {}

  /** Returns a provider instance wired with dependencies. */
  make(type: CrmType): ICrmProvider {
    switch (type) {
      case CrmType.ALTEGIO:
        return new AltegioProvider(this.accounts);
      case CrmType.EASYWEEK:
        return new EasyWeekProvider(this.tokens, this.accounts);
      default:
        throw new Error(`Unsupported provider: ${type as string}`);
    }
  }
}

