import { IsOptional, IsString } from 'class-validator';

export class EnsureCronSyncDto {
  @IsString()
  cron!: string;           // e.g., '0 */2 * * *'

  @IsOptional()
  @IsString()
  tz?: string;             // e.g., 'Europe/Kyiv'
}

