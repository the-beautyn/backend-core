import { ApiProperty } from '@nestjs/swagger';
import { CategoryResponseDto } from './category-response.dto';

export class CrmCategoryDto {
  @ApiProperty()
  externalId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  parentExternalId?: string | null;

  @ApiProperty({ required: false, nullable: true })
  color?: string | null;

  @ApiProperty({ required: false, nullable: true })
  sortOrder?: number | null;

  @ApiProperty({ required: false, nullable: true })
  isActive?: boolean;

  @ApiProperty({ required: false, nullable: true })
  updatedAtIso?: string;
}

export class CrmCategoryPageDto {
  @ApiProperty({ type: () => CrmCategoryDto, isArray: true })
  items!: CrmCategoryDto[];

  @ApiProperty()
  fetched!: number;

  @ApiProperty({ required: false, nullable: true })
  total?: number;

  @ApiProperty({ required: false, nullable: true })
  nextCursor?: string;
}

export class CategoriesSyncResultDto {
  @ApiProperty()
  upserted!: number;

  @ApiProperty()
  deleted!: number;

  @ApiProperty({ type: () => CategoryResponseDto, isArray: true })
  categories!: CategoryResponseDto[];
}

export class CategoriesSyncJobResponseDto {
  @ApiProperty()
  jobId!: string;
}
