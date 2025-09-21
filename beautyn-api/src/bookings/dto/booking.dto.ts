import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class BookingDto {
  @ApiProperty()
  @Expose()
  external_id!: string;

  @ApiProperty()
  @Expose()
  start_at_iso!: string;

  @ApiPropertyOptional()
  @Expose()
  duration_min?: number;

  @ApiPropertyOptional()
  @Expose()
  note?: string;

  @ApiPropertyOptional()
  @Expose()
  is_deleted?: boolean;

  @ApiPropertyOptional()
  @Expose()
  worker_external_id?: string;

  @ApiPropertyOptional({ type: [String] })
  @Expose()
  service_external_ids?: string[];
}


