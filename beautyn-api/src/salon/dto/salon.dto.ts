import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { CategoryResponseDto } from '../../categories/dto/category-response.dto';
import { ServiceDto } from '../../services/dto/service.dto';
import { PublicWorkerDto } from '../../workers/dto/worker-public.dto';

export class SalonDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty()
  @Expose()
  name!: string;

  @ApiProperty({ required: false })
  @Expose()
  address_line?: string;

  @ApiProperty({ required: false })
  @Expose()
  city?: string;

  @ApiProperty({ required: false })
  @Expose()
  country?: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  latitude?: number;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  longitude?: number;

  @ApiProperty({ required: false })
  @Expose()
  phone?: string;

  @ApiProperty({ required: false })
  @Expose()
  email?: string;

  @ApiProperty({ required: false })
  @Expose()
  provider?: string;

  @ApiProperty({ required: false })
  @Expose()
  description?: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  rating_avg?: number;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  rating_count?: number;

  @ApiProperty({ required: false })
  @Expose()
  open_hours_json?: unknown;

  @ApiProperty({ required: false })
  @Expose()
  working_schedule?: string;

  @ApiProperty({ required: false, nullable: true })
  @Expose()
  images_count?: number;

  @ApiProperty({ required: false })
  @Expose()
  cover_image_url?: string;

  @ApiProperty({ required: false, type: ServiceDto, isArray: true })
  @Expose()
  services?: ServiceDto[];

  @ApiProperty({ required: false, type: PublicWorkerDto, isArray: true })
  @Expose()
  workers?: PublicWorkerDto[];

  @ApiProperty({ required: false, type: CategoryResponseDto, isArray: true })
  @Expose()
  categories?: CategoryResponseDto[];

  @ApiProperty({ required: false, type: String, isArray: true })
  @Expose()
  images?: string[];
}
