import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { CrmType } from '@crm/shared';
import { CapabilityRegistryService } from '@crm/capability-registry';
import { CrmIntegrationService } from '../crm-integration/core/crm-integration.service';
import { PrismaService } from '../shared/database/prisma.service';
import { CategoriesRepository } from './repositories/categories.repo';
import { ListQueryDto, CATEGORY_LIST_MAX_LIMIT } from './dto/list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryListResponseDto, CategoryResponseDto } from './dto/category-response.dto';
import { CategoryData, CategoryUpdateInput, Page } from '@crm/provider-core';
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
    private readonly crmIntegration: CrmIntegrationService,
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

  async pullFromDb(userId: string, opts?: { page?: number; limit?: number }): Promise<CategoryListResponseDto> {
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
    const name = dto.title.trim();
    await this.ensureNameUnique(salonId, name);

    const sortOrder = dto.weight ?? null;

    const crmCategory = await this.crmIntegration.createCategory(salonId, provider, {
      title: name,
      weight: sortOrder ?? undefined,
      staff: dto.staff,
    });

    const saved = await this.repo.upsertFromCrm(salonId, {
      crmExternalId: crmCategory.externalId ?? null,
      name: crmCategory.name ?? name,
      color: normalizeHexColor(crmCategory.color ?? null),
      sortOrder: crmCategory.sortOrder ?? sortOrder,
    });

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

    const patch: CategoryUpdateInput = {};
    if (dto.title !== undefined) {
      patch.title = dto.title.trim();
      if (patch.title.length === 0) {
        throw new BadRequestException('name must not be empty');
      }
      await this.ensureNameUnique(salonId, patch.title, category.id);
    }
    if (dto.weight !== undefined) {
      patch.weight = dto.weight;
    }
    if (dto.staff !== undefined) {
      patch.staff = dto.staff;
    }

    if (!category.crmExternalId) {
      throw new ConflictException({ message: 'Category is not linked to CRM', code: 'CATEGORY_MISSING_CRM_EXTERNAL_ID' });
    }

    let crmResult: CategoryData | undefined;
    if (patch.title !== undefined || patch.weight !== undefined || patch.staff !== undefined) {
      crmResult = await this.crmIntegration.updateCategory(salonId, provider, category.crmExternalId, patch);
    }

    const data: Record<string, any> = {};
    if (crmResult?.name !== undefined && crmResult.name.length > 0) data.name = crmResult.name;
    else if (patch.title !== undefined) data.name = patch.title;

    if (crmResult?.color !== undefined) data.color = normalizeHexColor(crmResult.color);

    if (crmResult?.sortOrder !== undefined) data.sortOrder = crmResult.sortOrder;
    else if (patch.weight !== undefined) data.sortOrder = patch.weight;

    const updated = Object.keys(data).length
      ? await this.repo.update(category.id, data)
      : category;

    return toCategoryResponse(updated);
  }

  async delete(ownerId: string, categoryId: string): Promise<void> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);
    const category = await this.repo.findByIdWithinSalon(categoryId, salonId);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const hasServices = await this.repo.hasServices(category.id);
    if (hasServices) {
      throw new ConflictException({ message: 'Category has linked services', code: 'CATEGORY_HAS_SERVICES' });
    }

    if (!category.crmExternalId) {
      throw new ConflictException({ message: 'Category is not linked to CRM', code: 'CATEGORY_MISSING_CRM_EXTERNAL_ID' });
    }

    await this.crmIntegration.deleteCategory(salonId, provider, category.crmExternalId);
    await this.repo.delete(category.id);
  }

  async pullFromCrm(ownerId: string): Promise<Page<CategoryData>> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);
    this.caps.assert(provider, 'supportsCategoriesSync');
    return this.crmIntegration.pullCategories(salonId, provider);
  }

  async rebaseFromCrm(ownerId: string): Promise<{ categories: CategoryResponseDto[]; upserted: number; deleted: number }> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);
    this.caps.assert(provider, 'supportsCategoriesSync');
    const result = await this.crmIntegration.rebaseCategoriesNow(salonId, provider);
    return {
      categories: (result.categories ?? []) as CategoryResponseDto[],
      upserted: result.upserted ?? 0,
      deleted: result.deleted ?? 0,
    };
  }

  async rebaseFromCrmAsync(ownerId: string): Promise<{ jobId: string }> {
    const { salonId, provider } = await this.requireOwnerSalon(ownerId);
    this.caps.assert(provider, 'supportsCategoriesSync');
    return this.crmIntegration.enqueueCategoriesSync(salonId, provider);
  }

  async syncFromCrm(payload: CategoriesSyncDto): Promise<{ upserted: number; deleted: number; categories: ReturnType<typeof toCategoryResponse>[] }> {
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

    const final = await prismaAny.category.findMany({ where: { salonId: salon_id } });
    const categoriesOut = final.map(toCategoryResponse);
    return { upserted, deleted, categories: categoriesOut };
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

}
