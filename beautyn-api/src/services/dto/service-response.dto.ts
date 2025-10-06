import { ApiProperty } from '@nestjs/swagger';

export class ServiceResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  salonId!: string;

  @ApiProperty({ required: false, nullable: true })
  categoryId!: string | null;

  @ApiProperty({ required: false, nullable: true })
  crmServiceId!: string;

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
  isActive!: boolean;

  @ApiProperty({ required: false, nullable: true })
  sortOrder!: number | null;

  @ApiProperty({ type: [String] })
  workerIds!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
