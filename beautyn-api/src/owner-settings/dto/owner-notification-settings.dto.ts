import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class OwnerNotificationSettingsDto {
  @ApiProperty({ example: true })
  @Expose()
  in_app_enabled!: boolean;

  @ApiProperty({ example: true })
  @Expose()
  email_enabled!: boolean;

  @ApiProperty({ example: true })
  @Expose()
  sms_enabled!: boolean;
}
