import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { SalonCategoryMapping, SalonCategoryMappingUpdatedBy } from '@prisma/client';

interface UpsertMappingInput {
  salonCategoryId: string;
  appCategoryId: string | null;
  autoMatched?: boolean;
  confidence?: number | null;
  updatedBy?: SalonCategoryMappingUpdatedBy;
}

@Injectable()
export class SalonCategoryMappingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findBySalonCategoryId(salonCategoryId: string): Promise<SalonCategoryMapping | null> {
    return (this.prisma as any).salonCategoryMapping.findUnique({ where: { salonCategoryId } });
  }

  async upsert(input: UpsertMappingInput): Promise<SalonCategoryMapping> {
    const prismaAny = this.prisma as any;
    return prismaAny.salonCategoryMapping.upsert({
      where: { salonCategoryId: input.salonCategoryId },
      create: {
        salonCategoryId: input.salonCategoryId,
        appCategoryId: input.appCategoryId,
        autoMatched: input.autoMatched ?? false,
        confidence: input.confidence ?? null,
        updatedBy: input.updatedBy ?? 'system',
      },
      update: {
        appCategoryId: input.appCategoryId,
        autoMatched: input.autoMatched ?? false,
        confidence: input.confidence ?? null,
        updatedBy: input.updatedBy ?? 'system',
      },
    });
  }
}
