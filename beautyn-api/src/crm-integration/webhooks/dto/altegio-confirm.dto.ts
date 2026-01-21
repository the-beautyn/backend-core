import { ArrayNotEmpty, IsArray, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AltegioConfirmDto {
  @ApiProperty({ example: '482913' })
  @IsString()
  @Length(6, 6)
  code!: string;

  @ApiProperty({ example: ['1315014'], isArray: true })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[1-9]\d*$/, { each: true, message: 'salon_ids must be positive numeric strings' })
  salon_ids!: string[];
}
