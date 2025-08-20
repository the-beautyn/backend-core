import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class SalonImageDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  image_url!: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  caption?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  sort_order?: number | null;
}


