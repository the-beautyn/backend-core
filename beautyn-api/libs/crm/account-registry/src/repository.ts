import { CrmType } from '@crm/shared';
import { CrmAccountDto } from './types';

export interface AccountRegistryRepository {
  find(salonId: string, provider: CrmType): Promise<CrmAccountDto | null>;
  upsert(payload: CrmAccountDto): Promise<void>;
}

