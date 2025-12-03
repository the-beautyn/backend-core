import { ApiProperty } from '@nestjs/swagger';

export class SalonCategoryMappingResponseDto {
  @ApiProperty()
  salonCategoryId!: string;

  @ApiProperty({ required: false, nullable: true })
  appCategoryId!: string | null;

  @ApiProperty()
  autoMatched!: boolean;

  @ApiProperty({ required: false, nullable: true })
  confidence!: number | null;

  @ApiProperty()
  updatedBy!: 'system' | 'owner';

  @ApiProperty()
  updatedAt!: Date;
}
