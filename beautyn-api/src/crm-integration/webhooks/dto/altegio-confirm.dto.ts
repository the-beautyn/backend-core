import { IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AltegioConfirmDto {
  @ApiProperty({ example: '482913' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: '1315014' })
  @IsString()
  salon_id!: string;
}
