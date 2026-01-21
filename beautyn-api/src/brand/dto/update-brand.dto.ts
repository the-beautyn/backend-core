import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateBrandDto {
  @ApiPropertyOptional({ example: 'Updated Brand Name' })
  @IsOptional()
  @IsString()
  @Length(2, 160)
  name?: string;
}
