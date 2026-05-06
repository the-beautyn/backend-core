import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ClientNotificationSettingsDto {
  @ApiProperty({ example: true })
  @Expose()
  push_enabled!: boolean;

  @ApiProperty({ example: true })
  @Expose()
  email_enabled!: boolean;

  @ApiProperty({ example: true })
  @Expose()
  sms_enabled!: boolean;
}
