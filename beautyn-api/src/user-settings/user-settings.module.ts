import { Module } from '@nestjs/common';
import { ClientSettingsModule } from '../client-settings/client-settings.module';
import { OwnerSettingsModule } from '../owner-settings/owner-settings.module';
import { UserSettingsService } from './user-settings.service';

@Module({
  imports: [ClientSettingsModule, OwnerSettingsModule],
  providers: [UserSettingsService],
  exports: [UserSettingsService],
})
export class UserSettingsModule {}
