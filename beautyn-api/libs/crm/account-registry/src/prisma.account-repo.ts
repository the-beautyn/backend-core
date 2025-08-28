import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AccountRegistryRepository } from './repository';
import { CrmType } from '@crm/shared';
import { CrmAccountDto } from './types';

@Injectable()
export class PrismaAccountRegistryRepository implements AccountRegistryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async find(salonId: string, provider: CrmType): Promise<CrmAccountDto | null> {
    const row = await this.prisma.crmAccount.findUnique({ where: { salonId_provider: { salonId, provider } } });
    if (!row) return null;
    return {
      salonId: row.salonId,
      provider: row.provider as CrmType,
      data: row.data as any,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async upsert(payload: CrmAccountDto): Promise<void> {
    await this.prisma.crmAccount.upsert({
      where: { salonId_provider: { salonId: payload.salonId, provider: payload.provider } },
      update: { data: payload.data as any },
      create: { salonId: payload.salonId, provider: payload.provider, data: payload.data as any },
    });
  }
}

