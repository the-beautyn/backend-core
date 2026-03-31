import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HomeFeedSalonCardDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  coverImageUrl?: string | null;

  @ApiPropertyOptional()
  addressLine?: string | null;

  @ApiPropertyOptional()
  city?: string | null;

  @ApiPropertyOptional()
  ratingAvg?: number | null;

  @ApiPropertyOptional()
  ratingCount?: number | null;

  @ApiPropertyOptional()
  distanceKm?: number | null;

  @ApiPropertyOptional()
  isSaved?: boolean;
}
