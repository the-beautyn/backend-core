import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class ChangeActionResponseDto {
  @ApiProperty()
  @Expose()
  id!: string;

  @ApiProperty({ enum: ['accepted', 'dismissed'] })
  @Expose()
  status!: 'accepted' | 'dismissed';
}


