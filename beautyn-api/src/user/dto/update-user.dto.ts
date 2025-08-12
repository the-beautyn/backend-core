import { IsOptional, IsString, IsUrl } from 'class-validator';
import { IsAllowedAvatarDomain } from '../../shared/validators/is-allowed-avatar-domain.validator';
import { IsValidPhone } from '../../shared/validators/is-valid-phone.validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  second_name?: string;

  @IsOptional()
  /**
   * Phone number must be in international format (E.164).
   * Supports all valid international phone numbers using Google's libphonenumber.
   * Examples: +1234567890, +44123456789, +81312345678, +3796698
   */
  @IsValidPhone()
  phone?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'] })
  @IsAllowedAvatarDomain({ message: 'avatar_url must be hosted on an allowed domain.' })
  avatar_url?: string;
}
