import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID } from 'class-validator';
import type { Lane } from '@crm/sync-scheduler';

export class BookingsRebaseDto {
  @ApiProperty()
  @IsUUID()
  salon_id!: string;

  // Optional sync lane (system-only). Omitted → full reconcile (slow scope), unchanged behavior.
  @ApiPropertyOptional({ enum: ['fast', 'slow'] })
  @IsOptional()
  @IsIn(['fast', 'slow'])
  lane?: Lane;
}
