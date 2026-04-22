import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppCategoryResponseDto } from '../../app-categories/dto/app-category-response.dto';
import { HomeFeedNextBookingDto } from './home-feed-next-booking.dto';
import { SavedSalonItemDto } from '../../saved-salons/dto/saved-salon-response.dto';
import { HomeFeedSectionDto } from './home-feed-section.dto';

export class HomeFeedResponseDto {
  @ApiPropertyOptional({ type: [AppCategoryResponseDto] })
  categories?: AppCategoryResponseDto[];

  @ApiPropertyOptional({ type: HomeFeedNextBookingDto, nullable: true })
  next_booking?: HomeFeedNextBookingDto | null;

  @ApiPropertyOptional({ type: [SavedSalonItemDto] })
  saved_salons?: SavedSalonItemDto[];

  @ApiProperty({ type: [HomeFeedSectionDto] })
  sections!: HomeFeedSectionDto[];
}
