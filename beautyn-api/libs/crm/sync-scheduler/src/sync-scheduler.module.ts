import { Module } from '@nestjs/common';
import { SyncSchedulerService } from './sync-scheduler.service';

@Module({
  providers: [SyncSchedulerService],
  exports: [SyncSchedulerService],
})
export class SyncSchedulerModule {}

