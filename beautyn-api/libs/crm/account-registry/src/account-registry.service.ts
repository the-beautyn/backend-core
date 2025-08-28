import { Injectable } from '@nestjs/common';
import { CrmType } from '@crm/shared';
import type { AccountRegistryRepository } from './repository';
import { AltegioAccount, EasyWeekAccount, CrmAccountDto } from './types';

@Injectable()
export class AccountRegistryService {
  constructor(private readonly repo: AccountRegistryRepository) {}

  async get(salonId: string, provider: CrmType) {
    return this.repo.find(salonId, provider);
  }

  async setAltegio(salonId: string, data: AltegioAccount): Promise<void> {
    const payload: CrmAccountDto = {
      salonId,
      provider: CrmType.ALTEGIO,
      data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.repo.upsert(payload);
  }

  async setEasyWeek(salonId: string, data: EasyWeekAccount): Promise<void> {
    const payload: CrmAccountDto = {
      salonId,
      provider: CrmType.EASYWEEK,
      data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.repo.upsert(payload);
  }
}

