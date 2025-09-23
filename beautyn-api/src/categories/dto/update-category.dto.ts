import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString, Length } from 'class-validator';

export class UpdateCategoryDto {
  @ApiProperty({ required: false, minLength: 1, maxLength: 120 })
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsInt()
  weight?: number;

  @ApiProperty({ required: false, type: [Number], description: 'List of staff identifiers' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  staff?: number[];
}
