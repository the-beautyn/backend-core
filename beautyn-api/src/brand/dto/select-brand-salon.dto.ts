import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SelectBrandSalonDto {
  @ApiProperty()
  @IsUUID()
  salon_id!: string;
}
