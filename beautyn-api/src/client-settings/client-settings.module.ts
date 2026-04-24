import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ClientSettingsRepository } from './client-settings.repository';
import { ClientSettingsService } from './client-settings.service';

@Module({
  imports: [SharedModule],
  providers: [ClientSettingsRepository, ClientSettingsService],
  exports: [ClientSettingsService],
})
export class ClientSettingsModule {}
