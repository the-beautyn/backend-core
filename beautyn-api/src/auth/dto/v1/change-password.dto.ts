import { MinLength, MaxLength, Matches, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_CHARSET,
  PASSWORD_COMPOSITION,
} from './password-policy';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldP@ssword1',
    description: 'Current account password',
  })
  @IsString()
  @IsNotEmpty()
  current_password: string;

  @ApiProperty({
    example: 'N3wP@ssword!',
    description: 'New account password',
  })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  @Matches(PASSWORD_CHARSET, {
    message: 'new_password must contain only Latin letters, digits, and special characters (no spaces)',
  })
  @Matches(PASSWORD_COMPOSITION, {
    message:
      'new_password must contain at least one uppercase letter, one lowercase letter, and one digit',
  })
  new_password: string;
}
