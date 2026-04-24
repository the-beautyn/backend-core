import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ example: true, description: 'Client only' })
  @IsOptional()
  @IsBoolean()
  push_enabled?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Owner only' })
  @IsOptional()
  @IsBoolean()
  in_app_enabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  email_enabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  sms_enabled?: boolean;
}
