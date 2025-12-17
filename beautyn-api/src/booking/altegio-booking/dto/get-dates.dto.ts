import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsArray, IsOptional, IsUUID, Matches } from 'class-validator';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export class GetBookableDatesDto {
  @ApiPropertyOptional({ type: [String], name: 'serviceIds[]' })
  @Expose({ name: 'serviceIds[]' })
  @Transform(({ value }) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]), { toClassOnly: true })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  serviceIds?: string[];

  @ApiPropertyOptional()
  @IsUUID('4')
  @IsOptional()
  workerId?: string;

  @ApiPropertyOptional()
  @Matches(DATE_RE)
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional()
  @Matches(DATE_RE)
  @IsOptional()
  dateTo?: string;
}
