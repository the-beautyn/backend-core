import { IsString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { normalizePhone } from '../../../shared/validators/normalize-phone';

export class SendOtpDto {
  @ApiProperty({
    example: '+380501234567',
    description: 'Phone number in E.164 format',
  })
  @Transform(({ value }) => normalizePhone(value))
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'phone must be in E.164 format (e.g. +380501234567)' })
  phone: string;
}
