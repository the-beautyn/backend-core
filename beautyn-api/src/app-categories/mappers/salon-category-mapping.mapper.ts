import { SalonCategoryMapping } from '@prisma/client';
import { SalonCategoryMappingResponseDto } from '../dto/salon-category-mapping-response.dto';

export function toSalonCategoryMappingResponse(entity: SalonCategoryMapping): SalonCategoryMappingResponseDto {
  return {
    salonCategoryId: entity.salonCategoryId,
    appCategoryId: entity.appCategoryId ?? null,
    autoMatched: entity.autoMatched,
    confidence: entity.confidence ?? null,
    updatedBy: entity.updatedBy,
    updatedAt: entity.updatedAt,
  };
}
