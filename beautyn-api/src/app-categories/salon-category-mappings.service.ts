import { Injectable } from '@nestjs/common';
import { SalonCategoryMappingsRepository } from './repositories/salon-category-mappings.repo';
import { UpdateSalonCategoryMappingDto } from './dto/update-salon-category-mapping.dto';
import { SalonAppCategoryMappingDto, SalonCategoryMappingResponseDto } from './dto/salon-category-mapping-response.dto';
import { toSalonCategoryMappingResponse } from './mappers/salon-category-mapping.mapper';
import { AppCategoriesService } from './app-categories.service';
import { AppCategory } from '@prisma/client';

@Injectable()
export class SalonCategoryMappingsService {
  constructor(
    private readonly repo: SalonCategoryMappingsRepository,
    private readonly appCategories: AppCategoriesService,
  ) {}

  async upsert(
    salonCategoryId: string,
    dto: UpdateSalonCategoryMappingDto,
    updatedBy: 'system' | 'owner' = 'system',
  ): Promise<SalonCategoryMappingResponseDto> {
    const mapping = await this.repo.upsert({
      salonCategoryId,
      appCategoryId: dto.appCategoryId ?? null,
      autoMatched: dto.autoMatched ?? false,
      confidence: null,
      updatedBy,
    });
    return toSalonCategoryMappingResponse(mapping);
  }

  async find(salonCategoryId: string): Promise<SalonCategoryMappingResponseDto | null> {
    const mapping = await this.repo.findBySalonCategoryId(salonCategoryId);
    return mapping ? toSalonCategoryMappingResponse(mapping) : null;
  }

  async listBySalonIds(salonIds: string[]): Promise<SalonAppCategoryMappingDto[]> {
    const rows = await this.repo.findMappingsBySalonIds(salonIds);
    return rows.map((row) => ({
      salon_id: row.salonId,
      salon_name: row.salonName,
      salon_category_id: row.salonCategoryId,
      app_category_id: row.appCategoryId,
      app_category_name: row.appCategoryName,
    }));
  }

  async autoMatchAndUpsert(
    salonCategoryId: string,
    categoryName: string,
    activeAppCategories?: AppCategory[],
  ): Promise<void> {
    const existing = await this.repo.findBySalonCategoryId(salonCategoryId);
    if (existing?.updatedBy === 'owner') return;

    const pool = activeAppCategories ?? (await this.appCategories.findActiveForMatching());
    const match = this.appCategories.matchByName(categoryName, pool);
    await this.repo.upsert({
      salonCategoryId,
      appCategoryId: match?.appCategoryId ?? null,
      autoMatched: Boolean(match),
      confidence: match?.confidence ?? null,
      updatedBy: 'system',
    });
  }
}
