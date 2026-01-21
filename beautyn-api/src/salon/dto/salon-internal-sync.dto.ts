import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsUUID } from 'class-validator';
import type { SalonData } from '@crm/provider-core';

export class SalonInternalSyncDto {
  @ApiProperty()
  @IsUUID()
  salon_id!: string;

  @ApiProperty()
  @IsOptional()
  @IsObject()
  salon!: SalonData;
}