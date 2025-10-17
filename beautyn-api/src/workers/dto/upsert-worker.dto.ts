import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class UpsertWorkerDto {
  @ApiProperty({ example: 'Alice' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  first_name!: string;

  @ApiProperty({ example: 'Brown' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 120)
  last_name!: string;

  @ApiProperty({ required: false, example: 'Hair Stylist' })
  @IsOptional()
  @IsString()
  @Length(0, 160)
  position?: string;

  @ApiProperty({ required: false, example: 'Expert in color corrections' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, nullable: true, example: 'alice@example.com' })
  @IsOptional()
  @IsString()
  email?: string | null;

  @ApiProperty({ required: false, nullable: true, example: '+12025550123' })
  @IsOptional()
  @IsString()
  phone?: string | null;

  @ApiProperty({ required: false, nullable: true, example: 'https://example.com/photo.jpg' })
  @IsOptional()
  @IsString()
  photo_url?: string | null;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
