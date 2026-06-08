import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsISO8601, IsOptional, IsUUID, MinLength } from 'class-validator';

export class CreateAltegioRecordDto {
  // Optional: when omitted the booking is created with "any team member"
  // (Altegio `staff_id: 0`), matching the "Будь-який" option in the flow.
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  workerId?: string;

  @ApiProperty({ type: [String] })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsUUID('4', { each: true })
  serviceIds!: string[];

  @ApiProperty()
  @IsISO8601()
  datetime!: string;

  @ApiPropertyOptional()
  @MinLength(1)
  @IsOptional()
  comment?: string;
}
