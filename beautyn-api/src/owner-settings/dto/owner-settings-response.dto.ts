import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { OwnerNotificationSettingsDto } from './owner-notification-settings.dto';

export class OwnerSettingsResponseDto {
  @ApiProperty({ type: () => OwnerNotificationSettingsDto })
  @Expose()
  @Type(() => OwnerNotificationSettingsDto)
  notifications!: OwnerNotificationSettingsDto;
}
