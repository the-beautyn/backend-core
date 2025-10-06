import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ServiceDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  salon_id!: string;

  @ApiProperty({ required: true, nullable: false })
  @Expose()
  crm_service_id!: string;

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
  duration!: number;

  @ApiProperty()
  @Expose()
  price!: number;

  @ApiProperty()
  @Expose()
  currency!: string;

  @ApiProperty()
  @Expose()
  is_active!: boolean;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  sort_order!: number | null;

  @ApiProperty({ type: [String], required: false })
  @Expose()
  worker_ids!: string[];
}
