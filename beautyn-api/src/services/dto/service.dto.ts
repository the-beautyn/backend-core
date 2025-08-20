import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ServiceDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  salon_id!: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  crm_external_id!: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  category_id!: string | null;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  description!: string | null;

  @ApiProperty()
  @Expose()
  duration_minutes!: number;

  @ApiProperty()
  @Expose()
  price_cents!: number;

  @ApiProperty()
  @Expose()
  currency!: string;

  @ApiProperty()
  @Expose()
  is_active!: boolean;
}
