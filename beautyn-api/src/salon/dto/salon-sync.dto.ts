import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class SalonSyncDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address_line?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2)
  country?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  working_schedule?: string;

  @IsOptional()
  @IsNumber()
  rating_avg?: number;

  @IsOptional()
  @IsNumber()
  rating_count?: number;

  @IsOptional()
  open_hours_json?: unknown;

  @IsOptional()
  @IsNumber()
  images_count?: number;

  @IsOptional()
  @IsString()
  cover_image_url?: string;
}
