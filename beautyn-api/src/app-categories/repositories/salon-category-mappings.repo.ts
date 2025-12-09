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

  async findMappingsBySalonIds(salonIds: string[]): Promise<
    {
      salonId: string;
      salonName: string;
      salonCategoryId: string;
      appCategoryId: string | null;
      appCategoryName: string | null;
    }[]
  > {
    if (salonIds.length === 0) {
      return [];
    }
    const prismaAny = this.prisma as any;
    return prismaAny.$queryRaw`
      SELECT
        c.salon_id AS "salonId",
        s.name AS "salonName",
        scm.salon_category_id AS "salonCategoryId",
        scm.app_category_id AS "appCategoryId",
        ac.name AS "appCategoryName"
      FROM salon_category_mappings scm
      JOIN categories c ON c.id = scm.salon_category_id
      JOIN salons s ON s.id = c.salon_id
      LEFT JOIN app_categories ac ON ac.id = scm.app_category_id
      WHERE c.salon_id = ANY(${salonIds}::uuid[])
    `;
  }
}
