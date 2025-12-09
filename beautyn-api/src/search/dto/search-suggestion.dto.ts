import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type SuggestionType = 'salon' | 'history';

export class SearchSuggestionDto {
  @ApiProperty({ description: 'Salon ID (shared for both history and salon suggestions)' })
  id!: string;

  @ApiProperty({ enum: ['salon', 'history'] })
  type!: SuggestionType;

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional()
  subtitle?: string;

  @ApiPropertyOptional()
  logoUrl?: string;
}
