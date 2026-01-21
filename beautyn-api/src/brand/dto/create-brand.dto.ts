import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'My Brand' })
  @IsString()
  @Length(2, 160)
  name!: string;
}
