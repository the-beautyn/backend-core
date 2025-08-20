import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ServicesService } from './services.service';

@Module({
  imports: [SharedModule],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
