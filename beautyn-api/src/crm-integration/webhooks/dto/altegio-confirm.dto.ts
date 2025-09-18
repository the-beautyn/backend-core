import { IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AltegioConfirmDto {
  @ApiProperty({ example: '482913' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: '1315014' })
  @IsString()
  @Matches(/^[1-9]\d*$/, { message: 'salon_id must be a positive numeric string' })
  salon_id!: string;
}
