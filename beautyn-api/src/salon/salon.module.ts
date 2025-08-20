import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { SalonService } from './salon.service';

@Module({
  imports: [SharedModule],
  providers: [SalonService],
  exports: [SalonService],
})
export class SalonModule {}
