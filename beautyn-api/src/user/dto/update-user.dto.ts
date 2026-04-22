import { IsOptional, IsString, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsAllowedAvatarDomain } from '../../shared/validators/is-allowed-avatar-domain.validator';
import { IsValidPhone } from '../../shared/validators/is-valid-phone.validator';
import { normalizePhone } from '../../shared/validators/normalize-phone';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  second_name?: string;

  @IsOptional()
  /**
   * Phone number in international format.
   * Ukrainian numbers: +380XXXXXXXXX (detailed validation)
   * Other countries: +[country code][number] (basic validation)
   * Examples: +380501234567 (Ukraine), +12125551234 (USA)
   */
  @Transform(({ value }) => normalizePhone(value))
  @IsValidPhone()
  phone?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'] })
  @IsAllowedAvatarDomain({ message: 'avatar_url must be hosted on an allowed domain.' })
  avatar_url?: string;
}
