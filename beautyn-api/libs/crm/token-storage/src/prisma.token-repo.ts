import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { TokenStorageRepository, CrmCredentialRow } from './repository';

@Injectable()
export class PrismaTokenStorageRepository implements TokenStorageRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findUnique(salonId: string, provider: string): Promise<CrmCredentialRow | null> {
    const row = await this.prisma.crmCredential.findUnique({ where: { salonId_provider: { salonId, provider } } });
    return row
      ? {
          id: row.id,
          salonId: row.salonId,
          provider: row.provider,
          cipherText: row.cipherText as unknown as Uint8Array,
          iv: row.iv as unknown as Uint8Array,
          authTag: row.authTag as unknown as Uint8Array,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }
      : null;
  }

  async upsert(data: Omit<CrmCredentialRow, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    await this.prisma.crmCredential.upsert({
      where: { salonId_provider: { salonId: data.salonId, provider: data.provider } },
      update: {
        cipherText: Buffer.from(data.cipherText),
        iv: Buffer.from(data.iv),
        authTag: Buffer.from(data.authTag),
      },
      create: {
        salonId: data.salonId,
        provider: data.provider,
        cipherText: Buffer.from(data.cipherText),
        iv: Buffer.from(data.iv),
        authTag: Buffer.from(data.authTag),
      },
    });
  }

  async delete(salonId: string, provider: string): Promise<void> {
    await this.prisma.crmCredential
      .delete({ where: { salonId_provider: { salonId, provider } } })
      .catch(() => {});
  }
}

