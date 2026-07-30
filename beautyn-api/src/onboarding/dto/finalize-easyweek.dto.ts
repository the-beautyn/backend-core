import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class FinalizeEasyWeekSalonDto {
  @ApiProperty({ format: 'uuid', description: 'EasyWeek salon (location) UUID from the discover step.' })
  @IsUUID('4')
  uuid!: string;

  @ApiProperty({
    required: false,
    description:
      'Per-salon online-booking widget URL. When omitted, the backend derives it from the workspace slug.',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  widget_url?: string;
}

export class FinalizeEasyWeekDto {
  @IsString()
  @IsNotEmpty()
  auth_token!: string;

  @IsString()
  @IsNotEmpty()
  workspace_slug!: string;

  @ApiProperty({ type: [FinalizeEasyWeekSalonDto], description: 'Selected salons to link (at least one).' })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => FinalizeEasyWeekSalonDto)
  salons!: FinalizeEasyWeekSalonDto[];
}
