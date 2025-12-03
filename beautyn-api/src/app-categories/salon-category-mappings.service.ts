import { Injectable } from '@nestjs/common';
import { SalonCategoryMappingsRepository } from './repositories/salon-category-mappings.repo';
import { UpdateSalonCategoryMappingDto } from './dto/update-salon-category-mapping.dto';
import { SalonCategoryMappingResponseDto } from './dto/salon-category-mapping-response.dto';
import { toSalonCategoryMappingResponse } from './mappers/salon-category-mapping.mapper';

@Injectable()
export class SalonCategoryMappingsService {
  constructor(private readonly repo: SalonCategoryMappingsRepository) {}

  async upsert(
    salonCategoryId: string,
    dto: UpdateSalonCategoryMappingDto,
    updatedBy: 'system' | 'owner' = 'system',
  ): Promise<SalonCategoryMappingResponseDto> {
    const mapping = await this.repo.upsert({
      salonCategoryId,
      appCategoryId: dto.appCategoryId ?? null,
      autoMatched: dto.autoMatched ?? false,
      confidence: undefined,
      updatedBy,
    });
    return toSalonCategoryMappingResponse(mapping);
  }

  async find(salonCategoryId: string): Promise<SalonCategoryMappingResponseDto | null> {
    const mapping = await this.repo.findBySalonCategoryId(salonCategoryId);
    return mapping ? toSalonCategoryMappingResponse(mapping) : null;
  }
}
