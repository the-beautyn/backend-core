import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum SalonClientSort {
  NAME_ASC = 'name_asc',
  NAME_DESC = 'name_desc',
  LAST_VISIT_DESC = 'last_visit_desc',
  BOOKINGS_DESC = 'bookings_desc',
}

/**
 * A decorated DTO rather than bare `@Query()` args, so the Swagger plugin emits the
 * params as genuinely optional and correctly typed for the owner-panel codegen.
 */
export class OwnerClientsListQueryDto {
  @ApiProperty({
    required: false,
    maxLength: 120,
    description: 'Case-insensitive match on name and email; digits match the phone with or without +380 formatting',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiProperty({ required: false, enum: SalonClientSort, default: SalonClientSort.NAME_ASC })
  @IsOptional()
  @IsEnum(SalonClientSort)
  sort?: SalonClientSort;

  @ApiProperty({ required: false, minimum: 1, description: '1-based' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 100, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
