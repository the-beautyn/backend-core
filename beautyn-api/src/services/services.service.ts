import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/database/prisma.service';
import { ServicesListQuery } from './dto/services-list.query';
import { ServicesSyncDto } from './dto/services-sync.dto';
import { ServiceDto } from './dto/service.dto';
import { toServiceDto } from './mappers/service.mapper';

type CategoryRecord = { id: string; name: string; crmExternalId: string | null };
type ServiceRecord = { id: string; name: string; crmExternalId: string | null };

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: ServicesListQuery,
  ): Promise<{ items: ServiceDto[]; page: number; limit: number; total: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { salonId: query.salon_id };
    if (query.category_id) where.categoryId = query.category_id;
    if (query.q) {
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    if (query.active !== undefined) where.isActive = query.active;

    const prismaAny = this.prisma as any;
    const [items, total] = await this.prisma.$transaction([
      prismaAny.service.findMany({ where, skip, take: limit }),
      prismaAny.service.count({ where }),
    ]);

    return {
      items: items.map(toServiceDto),
      page,
      limit,
      total,
    };
  }

  async syncFromCrm(payload: ServicesSyncDto): Promise<{ upserted: number; deleted: number; categories_upserted: number }> {
    const { salon_id } = payload;
    const categoriesInput = payload.categories ?? [];

    const existingCategories = await (this.prisma as any).category.findMany({ where: { salonId: salon_id } });
    const categoriesByCrm = new Map<string, CategoryRecord>();
    const categoriesByName = new Map<string, CategoryRecord>();
    existingCategories.forEach((c) => {
      if (c.crmExternalId) categoriesByCrm.set(c.crmExternalId, c);
      categoriesByName.set(c.name.toLowerCase(), c);
    });

    const keepCategoryIds = new Set<string>();
    let categoriesUpserted = 0;
    for (const cat of categoriesInput) {
      let existing: CategoryRecord | undefined = undefined;
      if (cat.crm_external_id && categoriesByCrm.has(cat.crm_external_id)) {
        existing = categoriesByCrm.get(cat.crm_external_id);
      } else if (categoriesByName.has(cat.name.toLowerCase())) {
        existing = categoriesByName.get(cat.name.toLowerCase());
      }

      if (existing) {
        existing = (await (this.prisma as any).category.update({
          where: { id: existing.id },
          data: {
            crmExternalId: cat.crm_external_id ?? null,
            name: cat.name,
            color: cat.color ?? null,
            sortOrder: cat.sort_order ?? null,
          },
        })) as CategoryRecord;
      } else {
        existing = (await (this.prisma as any).category.create({
          data: {
            salonId: salon_id,
            crmExternalId: cat.crm_external_id ?? null,
            name: cat.name,
            color: cat.color ?? null,
            sortOrder: cat.sort_order ?? null,
          },
        })) as CategoryRecord;
      }
      categoriesUpserted++;
      keepCategoryIds.add(existing.id);
      categoriesByName.set(existing.name.toLowerCase(), existing);
      if (existing.crmExternalId) categoriesByCrm.set(existing.crmExternalId, existing);
    }

    if (payload.categories) {
      const removeIds = existingCategories
        .filter((c) => !keepCategoryIds.has(c.id))
        .map((c) => c.id);
      if (removeIds.length) {
        await (this.prisma as any).category.deleteMany({ where: { id: { in: removeIds } } });
      }
    }

    const existingServices = await (this.prisma as any).service.findMany({ where: { salonId: salon_id } });
    const servicesByCrm = new Map<string, ServiceRecord>();
    const servicesByName = new Map<string, ServiceRecord>();
    existingServices.forEach((s) => {
      if (s.crmExternalId) servicesByCrm.set(s.crmExternalId, s);
      servicesByName.set(s.name.toLowerCase(), s);
    });

    let upserted = 0;
    const keepServiceIds = new Set<string>();
    for (const svc of payload.services) {
      let existing: ServiceRecord | undefined;
      if (svc.crm_external_id && servicesByCrm.has(svc.crm_external_id)) {
        existing = servicesByCrm.get(svc.crm_external_id);
      } else if (servicesByName.has(svc.name.toLowerCase())) {
        existing = servicesByName.get(svc.name.toLowerCase());
      }

      const categoryId = svc.category_external_id
        ? categoriesByCrm.get(svc.category_external_id)?.id ?? null
        : null;

      const data = {
        salonId: salon_id,
        crmExternalId: svc.crm_external_id ?? null,
        categoryId,
        name: svc.name,
        description: svc.description ?? null,
        durationMinutes: svc.duration_minutes,
        priceCents: svc.price_cents,
        currency: svc.currency,
        isActive: svc.is_active ?? true,
      };

      if (existing) {
        existing = (await (this.prisma as any).service.update({ where: { id: existing.id }, data })) as ServiceRecord;
      } else {
        existing = (await (this.prisma as any).service.create({ data })) as ServiceRecord;
      }
      upserted++;
      keepServiceIds.add(existing.id);
      servicesByName.set(existing.name.toLowerCase(), existing);
      if (existing.crmExternalId) servicesByCrm.set(existing.crmExternalId, existing);
    }

    const removeServiceIds = existingServices
      .filter((s) => !keepServiceIds.has(s.id))
      .map((s) => s.id);
    let deleted = 0;
    if (removeServiceIds.length) {
      const res = await (this.prisma as any).service.deleteMany({ where: { id: { in: removeServiceIds } } });
      deleted = res.count;
    }

    return { upserted, deleted, categories_upserted: categoriesUpserted };
  }
}
