import { ApiProperty } from '@nestjs/swagger';

export class ServiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  salon_id!: string;

  @ApiProperty({ required: false, nullable: true })
  category_id!: string | null;

  @ApiProperty({ required: false, nullable: true })
  crm_service_id!: string | null;

  @ApiProperty()
  title!: string;

  @ApiProperty({ required: false, nullable: true })
  description!: string | null;

  @ApiProperty()
  duration!: number;

  @ApiProperty()
  price!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  is_active!: boolean;

  @ApiProperty({ required: false, nullable: true })
  sort_order!: number | null;

  @ApiProperty({ type: [String] })
  worker_ids!: string[];

  @ApiProperty()
  created_at!: Date;

  @ApiProperty()
  updated_at!: Date;
}
