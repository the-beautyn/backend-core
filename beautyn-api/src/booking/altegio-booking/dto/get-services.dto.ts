import { ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Transform } from 'class-transformer';
import { IsArray, IsOptional, IsUUID } from 'class-validator';

export class GetBookableServicesDto {
  @ApiPropertyOptional({ type: [String], name: 'selectedServiceIds' })
  @Expose({ name: 'selectedServiceIds[]' })
  @Transform(({ value }) => (value === undefined ? undefined : Array.isArray(value) ? value : [value]), { toClassOnly: true })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  selectedServiceIds?: string[];

  @ApiPropertyOptional()
  @IsUUID('4')
  @IsOptional()
  workerId?: string;
}
