import { ApiProperty } from '@nestjs/swagger';

export class CrmServiceDto {
  @ApiProperty()
  externalId!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  description?: string | null;

  @ApiProperty()
  duration?: number | null;

  @ApiProperty()
  price?: number | null;

  @ApiProperty()
  currency?: string | null;

  @ApiProperty({ required: false, nullable: true })
  categoryExternalId?: string | null;

  @ApiProperty({ required: false })
  isActive?: boolean;

  @ApiProperty({ required: false, nullable: true })
  updatedAtIso?: string;
}

export class CrmServicePageDto {
  @ApiProperty({ type: () => CrmServiceDto, isArray: true })
  items!: CrmServiceDto[];

  @ApiProperty()
  fetched!: number;

  @ApiProperty({ required: false, nullable: true })
  total?: number;

  @ApiProperty({ required: false, nullable: true })
  nextCursor?: string;
}
