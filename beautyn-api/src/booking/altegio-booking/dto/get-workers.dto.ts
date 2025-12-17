import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsArray, IsISO8601, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class GetBookableWorkersDto {
  @ApiPropertyOptional({ type: [String], name: 'serviceIds[]' })
  @Expose({ name: 'serviceIds[]' })
  @Transform(({ value }) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]), { toClassOnly: true })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  serviceIds?: string[];

  @ApiPropertyOptional()
  @IsISO8601()
  @IsOptional()
  datetime?: string;

  @ApiPropertyOptional({ description: 'Include nearest slots in response', default: false })
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  @IsOptional()
  includeSlots?: boolean;
}
