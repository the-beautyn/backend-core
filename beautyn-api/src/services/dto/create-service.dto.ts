import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ minLength: 1, maxLength: 160 })
  @IsString()
  @IsNotEmpty()
  @Length(1, 160)
  title!: string;

  @ApiProperty({ description: 'category id' })
  @IsUUID()
  @IsNotEmpty()
  category_id!: string;

  @ApiProperty()
  @IsOptional()
  @IsInt()
  @Min(0)
  price?: number;
  
  @ApiProperty()
  @IsOptional()
  @IsString()
  currency?: string;

  // @ApiProperty({ required: false })
  // @IsOptional()
  // @IsInt()
  // discount?: number; // not used for now

  @ApiProperty({ description: 'Duration in seconds' })
  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  // @ApiProperty({ required: false })
  // @IsOptional()
  // @IsString()
  // comment?: string; // not used for now

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  sort_order?: number;

  @ApiProperty({ required: false, type: [String], description: 'Local worker ids assigned to the service' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  worker_ids?: string[];
}
