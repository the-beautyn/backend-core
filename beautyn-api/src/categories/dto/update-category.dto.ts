import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateCategoryDto {
  @ApiProperty({ required: false, minLength: 1, maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @ApiProperty({ required: false, pattern: '^#[0-9A-Fa-f]{6}$', example: '#FF9900', nullable: true })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

