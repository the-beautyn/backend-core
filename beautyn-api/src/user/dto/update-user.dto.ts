import { IsOptional, IsString, Matches, IsUrl } from 'class-validator';
import { IsAllowedAvatarDomain } from '../../shared/validators/is-allowed-avatar-domain.validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  second_name?: string;

  @IsOptional()
  /**
   * Phone number must be in E.164 international format: starts with '+', followed by country code and 8-15 digits.
   * Example: +12345678901
   */
  @Matches(/^\+[1-9]\d{7,14}$/)
  phone?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'] })
  @IsAllowedAvatarDomain({ message: 'avatar_url must be hosted on an allowed domain.' })
  avatar_url?: string;
}
