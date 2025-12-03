import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateAppCategoryDto {
  @ApiProperty({ minLength: 1, maxLength: 120, description: 'Unique slug used internally' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  @Matches(/^[a-z0-9-]+$/)
  slug!: string;

  @ApiProperty({ minLength: 1, maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 160)
  name!: string;

  @ApiProperty({ required: false, type: [String], description: 'Keywords to improve auto-matching' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiProperty({ required: false, description: 'Sort order for display' })
  @IsOptional()
  sortOrder?: number;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
