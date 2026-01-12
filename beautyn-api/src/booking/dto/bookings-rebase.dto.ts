import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class BookingsRebaseDto {
  @ApiProperty()
  @IsUUID()
  salon_id!: string;
}
