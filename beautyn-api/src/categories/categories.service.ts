import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CrmType } from '@crm/shared';
import { CapabilityRegistryService } from '@crm/capability-registry';
import { SyncSchedulerService } from '@crm/sync-scheduler';
import { CrmAdapterService } from '@crm/adapter';
import { PrismaService } from '../shared/database/prisma.service';
import { CategoriesRepository } from './repositories/categories.repo';
import { ListQueryDto, CATEGORY_LIST_MAX_LIMIT } from './dto/list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryListResponseDto, CategoryResponseDto } from './dto/category-response.dto';
import { CategoryData, Page } from '@crm/provider-core';
import { normalizeHexColor, toCategoryResponse } from './mappers/category.mapper';
import { createChildLogger } from '@shared/logger';
import { CategoriesSyncDto } from './dto/categories-sync.dto';

@Injectable()
export class CategoriesService {
  private readonly log = createChildLogger('categories.service');

  constructor(
    private readonly repo: CategoriesRepository,
    private readonly prisma: PrismaService,
    private readonly caps: CapabilityRegistryService,
    private readonly crm: CrmAdapterService,
    private readonly scheduler: SyncSchedulerService,
  ) {}

  async listPublic(query: ListQueryDto): Promise<CategoryListResponseDto> {
    if (!query.salonId) {
      throw new BadRequestException('salonId is required');
    }
    const { page, limit, skip } = this.normalizePagination(query.page, query.limit);
    const { items, total } = await this.repo.paginate(query.salonId, skip, limit);
    return {
      items: items.map(toCategoryResponse),
      page,
      limit,
      total,
    };
  }

  async listForOwner(userId: string, opts?: { page?: number; limit?: number }): Promise<CategoryListResponseDto> {
    const { salonId } = await this.requireOwnerSalon(userId);
    const { page, limit, skip } = this.normalizePagination(opts?.page, opts?.limit);
    const { items, total } = await this.repo.paginate(salonId, skip, limit);
    return {
      items: items.map(toCategoryResponse),
      page,
      limit,
      total,
    };
  }

  async create(ownerId: string, dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);
    const name = dto.name.trim();
    await this.ensureNameUnique(salonId, name);
    this.ensureCrudSupported(provider);

    const normalizedColor = normalizeHexColor(dto.color ?? null);
    const sortOrder = dto.sortOrder ?? null;

    const crmCategory = await this.crm.createCategory(salonId, provider, {
      name,
      color: normalizedColor ?? undefined,
      sortOrder: sortOrder ?? undefined,
    });

    const saved = await this.repo.upsertFromCrm(salonId, {
      crmExternalId: crmCategory.externalId ?? null,
      name: crmCategory.name ?? name,
      color: normalizeHexColor(crmCategory.color ?? normalizedColor),
      sortOrder: crmCategory.sortOrder ?? sortOrder,
    });

    this.enqueueSync(salonId, provider);
    return toCategoryResponse(saved);
  }

  async update(ownerId: string, categoryId: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    if (!dto || Object.keys(dto).length === 0) {
      const fallback = await this.repo.findById(categoryId);
      if (!fallback) throw new NotFoundException('Category not found');
      return toCategoryResponse(fallback);
    }

    const { salonId, provider } = await this.requireOwnerSalon(ownerId);
    const category = await this.repo.findByIdWithinSalon(categoryId, salonId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    this.ensureCrudSupported(provider);

    const patch: { name?: string; color?: string | null; sortOrder?: number | null } = {};
    if (dto.name !== undefined) {
      patch.name = dto.name.trim();
      if (patch.name.length === 0) {
        throw new BadRequestException('name must not be empty');
      }
      await this.ensureNameUnique(salonId, patch.name, category.id);
    }
    if (dto.color !== undefined) {
      patch.color = normalizeHexColor(dto.color ?? null);
    }
    if (dto.sortOrder !== undefined) {
      patch.sortOrder = dto.sortOrder ?? null;
    }

    if (!category.crmExternalId) {
      throw new ConflictException({ message: 'Category is not linked to CRM', code: 'CATEGORY_MISSING_CRM_EXTERNAL_ID' });
    }

    let crmResult: { name?: string; color?: string | null; sortOrder?: number | null } | undefined;
    if (patch.name !== undefined || patch.color !== undefined || patch.sortOrder !== undefined) {
      crmResult = await this.crm.updateCategory(salonId, provider, category.crmExternalId, {
        name: patch.name,
        color: patch.color ?? undefined,
        sortOrder: patch.sortOrder ?? undefined,
      });
    }

    const data: Record<string, any> = {};
    if (crmResult?.name !== undefined && crmResult.name.length > 0) data.name = crmResult.name;
    else if (patch.name !== undefined) data.name = patch.name;

    if (crmResult?.color !== undefined) data.color = normalizeHexColor(crmResult.color);
    else if (patch.color !== undefined) data.color = patch.color;

    if (crmResult?.sortOrder !== undefined) data.sortOrder = crmResult.sortOrder;
    else if (patch.sortOrder !== undefined) data.sortOrder = patch.sortOrder;

    const updated = Object.keys(data).length
      ? await this.repo.update(category.id, data)
      : category;

    this.enqueueSync(salonId, provider);
    return toCategoryResponse(updated);
  }

  async delete(ownerId: string, categoryId: string): Promise<void> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);
    const category = await this.repo.findByIdWithinSalon(categoryId, salonId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    this.ensureCrudSupported(provider);

    const hasServices = await this.repo.hasServices(category.id);
    if (hasServices) {
      throw new ConflictException({ message: 'Category has linked services', code: 'CATEGORY_HAS_SERVICES' });
    }

    if (!category.crmExternalId) {
      throw new ConflictException({ message: 'Category is not linked to CRM', code: 'CATEGORY_MISSING_CRM_EXTERNAL_ID' });
    }

    await this.crm.deleteCategory(salonId, provider, category.crmExternalId);
    await this.repo.delete(category.id);
    this.enqueueSync(salonId, provider);
  }

  async pullFromCrm(ownerId: string): Promise<Page<CategoryData>> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);
    this.caps.assert(provider, 'supportsCategoriesSync');
    return this.crm.pullCategories(salonId, provider);
  }

  async syncFromCrm(payload: CategoriesSyncDto): Promise<{ upserted: number; deleted: number }> {
    const { salon_id, categories } = payload;
    const prismaAny = this.prisma as any;
    this.log.info('Syncing categories from CRM', { salon_id, categories });

    const existing = await prismaAny.category.findMany({ where: { salonId: salon_id } });
    const categoriesByCrm = new Map<string, { id: string; name: string }>();
    const categoriesByName = new Map<string, { id: string; name: string }>();
    for (const c of existing) {
      if (c.crmExternalId) categoriesByCrm.set(c.crmExternalId, { id: c.id, name: c.name });
      categoriesByName.set(c.name.toLowerCase(), { id: c.id, name: c.name });
    }

    let upserted = 0;
    const keepIds = new Set<string>();
    for (const cat of categories) {
      const color = normalizeHexColor(cat.color ?? null);
      const sortOrder = cat.sort_order ?? null;

      let existingRecord: { id: string; name: string } | undefined;
      if (cat.crm_external_id && categoriesByCrm.has(cat.crm_external_id)) {
        existingRecord = categoriesByCrm.get(cat.crm_external_id);
      } else if (categoriesByName.has(cat.name.toLowerCase())) {
        existingRecord = categoriesByName.get(cat.name.toLowerCase());
      }

      if (existingRecord) {
        const updated = await prismaAny.category.update({
          where: { id: existingRecord.id },
          data: {
            crmExternalId: cat.crm_external_id ?? null,
            name: cat.name,
            color,
            sortOrder,
          },
        });
        keepIds.add(updated.id);
        categoriesByName.set(updated.name.toLowerCase(), { id: updated.id, name: updated.name });
        if (updated.crmExternalId) categoriesByCrm.set(updated.crmExternalId, { id: updated.id, name: updated.name });
      } else {
        const created = await prismaAny.category.create({
          data: {
            salonId: salon_id,
            crmExternalId: cat.crm_external_id ?? null,
            name: cat.name,
            color,
            sortOrder,
          },
        });
        keepIds.add(created.id);
        categoriesByName.set(created.name.toLowerCase(), { id: created.id, name: created.name });
        if (created.crmExternalId) categoriesByCrm.set(created.crmExternalId, { id: created.id, name: created.name });
      }
      upserted++;
    }

    const removeIds = existing
      .filter((c: any) => !keepIds.has(c.id))
      .map((c: any) => c.id);
    let deleted = 0;
    if (removeIds.length) {
      const res = await prismaAny.category.deleteMany({ where: { id: { in: removeIds } } });
      deleted = res.count ?? 0;
    }

    return { upserted, deleted };
  }

  private async ensureNameUnique(salonId: string, name: string, excludeId?: string): Promise<void> {
    const existing = await this.repo.findByNameInsensitive(salonId, name, excludeId);
    if (existing) {
      throw new ConflictException({ message: 'Category name already exists', code: 'CATEGORY_NAME_CONFLICT' });
    }
  }

  private async requireOwnerSalon(userId: string): Promise<{ salonId: string; provider: CrmType }> {
    const salon = await (this.prisma as any).salon.findFirst({
      where: { ownerUserId: userId, deletedAt: null },
      select: { id: true, provider: true },
    });

    if (!salon?.id) {
      throw new NotFoundException('Salon not found');
    }
    if (!salon.provider) {
      throw new ConflictException({ message: 'Salon is not linked to a CRM provider', code: 'SALON_NOT_LINKED_TO_CRM' });
    }
    return { salonId: salon.id, provider: salon.provider as CrmType };
  }

  private normalizePagination(page?: number, limit?: number): { page: number; limit: number; skip: number } {
    const resolvedPage = page && page > 0 ? page : 1;
    let resolvedLimit = limit && limit > 0 ? limit : 20;
    resolvedLimit = Math.min(resolvedLimit, CATEGORY_LIST_MAX_LIMIT);
    return {
      page: resolvedPage,
      limit: resolvedLimit,
      skip: (resolvedPage - 1) * resolvedLimit,
    };
  }

  private ensureCrudSupported(provider: CrmType): void {
    if (!this.caps.has(provider, 'supportsCategoryCrud')) {
      throw new ConflictException({ message: 'Category CRUD not supported for provider', code: 'CATEGORY_CRUD_NOT_SUPPORTED' });
    }
  }

  private async enqueueSync(salonId: string, provider: CrmType): Promise<void> {
    try {
      await this.scheduler.scheduleSync({ salonId, provider });
    } catch (err) {
      this.log.warn('Failed to enqueue post-write sync', { salonId, provider, error: (err as Error)?.message });
    }
  }
}
