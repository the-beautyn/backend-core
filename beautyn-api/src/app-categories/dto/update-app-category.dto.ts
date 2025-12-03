import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateAppCategoryDto {
  @ApiProperty({ required: false, minLength: 1, maxLength: 120, description: 'Unique slug used internally' })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;

  @ApiProperty({ required: false, minLength: 1, maxLength: 160 })
  @IsOptional()
  @IsString()
  @Length(1, 160)
  name?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
