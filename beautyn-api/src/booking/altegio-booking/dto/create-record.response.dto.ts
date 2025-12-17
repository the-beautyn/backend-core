import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAltegioRecordResponseDto {
  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  crmRecordId!: number;

  @ApiPropertyOptional()
  shortLink?: string | null;

  @ApiProperty({ enum: ['created'] })
  status!: 'created';
}
