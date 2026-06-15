import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import type { Lane } from '@crm/sync-scheduler';

// Body of the internal sync-dispatch tick: which lane to fan out across all active CRM salons.
export class SyncDispatchDto {
  @ApiProperty({ enum: ['fast', 'slow'] })
  @IsIn(['fast', 'slow'])
  lane!: Lane;
}
