import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsISO8601, IsOptional, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CreateAltegioRecordDto {
  @ApiProperty()
  @IsUUID('4')
  workerId!: string;

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

  @ApiPropertyOptional({ default: 1 })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  attendance?: number;
}
