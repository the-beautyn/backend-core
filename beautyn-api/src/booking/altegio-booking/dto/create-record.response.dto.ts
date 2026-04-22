import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAltegioRecordResponseDto {
  @ApiProperty()
  booking_id!: string;

  @ApiProperty()
  crm_record_id!: number;

  @ApiPropertyOptional()
  short_link?: string | null;

  @ApiProperty({ enum: ['created'] })
  status!: 'created';
}
