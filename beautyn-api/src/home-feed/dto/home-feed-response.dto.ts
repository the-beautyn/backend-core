import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppCategoryResponseDto } from '../../app-categories/dto/app-category-response.dto';
import { HomeFeedNextBookingDto } from './home-feed-next-booking.dto';
import { SavedSalonItemDto } from '../../saved-salons/dto/saved-salon-response.dto';
import { HomeFeedSectionDto } from './home-feed-section.dto';

export class HomeFeedResponseDto {
  @ApiPropertyOptional({ type: [AppCategoryResponseDto] })
  categories?: AppCategoryResponseDto[];

  @ApiPropertyOptional({ type: HomeFeedNextBookingDto, nullable: true })
  nextBooking?: HomeFeedNextBookingDto | null;

  @ApiPropertyOptional({ type: [SavedSalonItemDto] })
  savedSalons?: SavedSalonItemDto[];

  @ApiProperty({ type: [HomeFeedSectionDto] })
  sections!: HomeFeedSectionDto[];
}
