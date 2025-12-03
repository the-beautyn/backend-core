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
  sortOrder?: number | null;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
