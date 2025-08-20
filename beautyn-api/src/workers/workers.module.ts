import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { WorkersService } from './workers.service';

@Module({
  imports: [SharedModule],
  providers: [WorkersService],
  exports: [WorkersService],
})
export class WorkersModule {}
