import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SalonPullDto {
  @ApiProperty()
  @IsUUID()
  salon_id!: string;
}
