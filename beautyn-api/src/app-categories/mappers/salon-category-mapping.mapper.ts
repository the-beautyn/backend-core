import { SalonCategoryMapping } from '@prisma/client';
import { SalonCategoryMappingResponseDto } from '../dto/salon-category-mapping-response.dto';

export function toSalonCategoryMappingResponse(entity: SalonCategoryMapping): SalonCategoryMappingResponseDto {
  return {
    salon_category_id: entity.salonCategoryId,
    app_category_id: entity.appCategoryId ?? null,
    auto_matched: entity.autoMatched,
    confidence: entity.confidence ?? null,
    updated_by: entity.updatedBy,
    updated_at: entity.updatedAt,
  };
}
