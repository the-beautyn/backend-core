import { ApiProperty } from '@nestjs/swagger';

export class AppCategoryResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: [String] })
  keywords!: string[];

  @ApiProperty({ required: false })
  sort_order?: number | null;

  @ApiProperty({ required: false })
  image_url?: string | null;

  @ApiProperty()
  is_active!: boolean;

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}
