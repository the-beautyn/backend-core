import { ApiProperty } from '@nestjs/swagger';
import { AppCategoryResponseDto } from './app-category-response.dto';

export class AppCategoryListResponseDto {
  @ApiProperty({ type: [AppCategoryResponseDto] })
  items!: AppCategoryResponseDto[];

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  total!: number;
}
