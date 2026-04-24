import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { ClientNotificationSettingsDto } from './client-notification-settings.dto';

export class ClientSettingsResponseDto {
  @ApiProperty({ type: () => ClientNotificationSettingsDto })
  @Expose()
  @Type(() => ClientNotificationSettingsDto)
  notifications!: ClientNotificationSettingsDto;
}
