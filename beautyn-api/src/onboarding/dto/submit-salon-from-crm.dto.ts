import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsObject, IsOptional, IsString, ValidateIf } from 'class-validator';

export class SubmitSalonFromCrmDto {
  @ApiPropertyOptional({ description: 'Apply entire CRM snapshot to salon' })
  @IsOptional()
  @IsBoolean()
  accept_all?: boolean;

  @ApiPropertyOptional({ description: 'Apply only these field paths from CRM snapshot' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accepted_fields?: string[];

  @ApiPropertyOptional({ description: 'Override values to apply after CRM fields (partial patch)' })
  @IsOptional()
  @IsObject()
  overrides?: {
    name?: string | null;
    description?: string | null;
    mainImageUrl?: string | null;
    imageUrls?: string[];
    location?: {
      country?: string | null;
      city?: string | null;
      addressLine?: string | null;
      lat?: number | null;
      lon?: number | null;
    };
    workingSchedule?: string | null;
    timezone?: string | null;
  };
}