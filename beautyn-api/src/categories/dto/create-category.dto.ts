import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ minLength: 1, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  name!: string;

  @ApiProperty({ required: false, pattern: '^#[0-9A-Fa-f]{6}$', example: '#3366FF', nullable: true })
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @ApiProperty({ required: false, minimum: 0, nullable: true })
  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

