import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class CategoryDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  salon_id!: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  crm_external_id!: string | null;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  color!: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  sort_order!: number | null;

  @ApiProperty()
  @Expose()
  created_at!: Date;

  @ApiProperty()
  @Expose()
  updated_at!: Date;
}
