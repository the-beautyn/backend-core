import { IsString, Matches, Length } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { normalizePhone } from '../../../shared/validators/normalize-phone';

export class VerifyOtpDto {
  @ApiProperty({
    example: '+380501234567',
    description: 'Phone number in E.164 format',
  })
  @Transform(({ value }) => normalizePhone(value))
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'phone must be in E.164 format (e.g. +380501234567)' })
  phone: string;

  @ApiProperty({
    example: '1234',
    description: '4-digit verification code',
  })
  @IsString()
  @Length(4, 4, { message: 'code must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'code must be exactly 4 digits' })
  code: string;
}
