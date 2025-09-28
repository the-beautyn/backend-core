import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ minLength: 1, maxLength: 120 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  title!: string;

  @ApiProperty({ required: false, minimum: 0 })
  @IsOptional()
  @IsInt()
  weight?: number;

  @ApiProperty({ required: false, type: [Number], description: 'List of staff identifiers' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  staff?: number[];
}
