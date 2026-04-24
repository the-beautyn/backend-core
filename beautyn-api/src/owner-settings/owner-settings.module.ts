import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { OwnerSettingsRepository } from './owner-settings.repository';
import { OwnerSettingsService } from './owner-settings.service';

@Module({
  imports: [SharedModule],
  providers: [OwnerSettingsRepository, OwnerSettingsService],
  exports: [OwnerSettingsService],
})
export class OwnerSettingsModule {}
