import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { SavedSalonsRepository } from './saved-salons.repository';
import { SavedSalonsService } from './saved-salons.service';

@Module({
  imports: [SharedModule],
  providers: [SavedSalonsRepository, SavedSalonsService],
  exports: [SavedSalonsService],
})
export class SavedSalonsModule {}
