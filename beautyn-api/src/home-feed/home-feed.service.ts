import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { HomeFeedSectionConfigRepository } from './home-feed-section-config.repository';
import { AppCategoriesService } from '../app-categories/app-categories.service';
import { SavedSalonsService } from '../saved-salons/saved-salons.service';
import { SearchQueryBuilderService } from '../search/search-query-builder.service';
import { SearchRequestDto } from '../search/dto/search-request.dto';
import { ResolvedGeoContext } from '../search/geo-location.service';
import { SortOptionEnum } from '../search/enums/sort-option.enum';
import { HomeFeedResponseDto } from './dto/home-feed-response.dto';
import { HomeFeedSectionDto } from './dto/home-feed-section.dto';
import { HomeFeedSectionFiltersDto } from './dto/home-feed-section-filters.dto';
import { mapBookingToNextBooking, mapSearchRowToCard } from './mappers/home-feed.mapper';
import { HomeFeedSection } from '@prisma/client';

@Injectable()
export class HomeFeedService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sectionConfigRepo: HomeFeedSectionConfigRepository,
    private readonly appCategoriesService: AppCategoriesService,
    private readonly savedSalonsService: SavedSalonsService,
    private readonly searchQueryBuilder: SearchQueryBuilderService,
  ) {}

  async getHomeFeed(params: {
    userId?: string | null;
    latitude?: number;
    longitude?: number;
  }): Promise<HomeFeedResponseDto> {
    const activeSections = await this.sectionConfigRepo.listActive();

    const response: HomeFeedResponseDto = {
      sections: [],
    };

    const categoriesResult = await this.appCategoriesService.list({ onlyActive: true });
    response.categories = categoriesResult.items;

    if (params.userId) {
      const [nextBookingResult, savedSalonsResult] = await Promise.all([
        this.fetchNextBooking(params.userId),
        this.savedSalonsService.listByUser(params.userId, { limit: 10 }),
      ]);
      response.nextBooking = nextBookingResult;
      response.savedSalons = savedSalonsResult.items;
    }

    const sectionResults = await Promise.all(
      activeSections.map((section) => this.buildSection(section, params)),
    );

    response.sections = sectionResults;

    if (params.userId) {
      const allSalonIds = [...new Set(response.sections.flatMap((s) => s.items.map((i) => i.id)))];
      const uniqueSalonIds = Array.from(new Set(allSalonIds));
      if (uniqueSalonIds.length > 0) {
        const savedSet = await this.savedSalonsService.isSavedBatch(params.userId, uniqueSalonIds);
        for (const section of response.sections) {
          for (const item of section.items) {
            item.isSaved = savedSet.has(item.id);
          }
        }
      }
    }

    return response;
  }

  private async fetchNextBooking(userId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: {
        userId,
        datetime: { gte: new Date() },
        status: { notIn: ['canceled', 'completed', 'deleted'] },
      },
      orderBy: { datetime: 'asc' },
      include: {
        salon: {
          select: { name: true, coverImageUrl: true, addressLine: true },
        },
      },
    });

    if (!booking) return null;

    return mapBookingToNextBooking(booking, (booking as any).salon);
  }

  private async buildSection(
    config: HomeFeedSection,
    params: { latitude?: number; longitude?: number },
  ): Promise<HomeFeedSectionDto> {
    const filters = (config.filters as HomeFeedSectionFiltersDto) ?? {};

    const searchDto = new SearchRequestDto();
    if (filters.appCategoryId) {
      searchDto.appCategoryIds = [filters.appCategoryId];
    }
    if (filters.sortBy) {
      searchDto.sortBy = filters.sortBy as SortOptionEnum;
    }
    if (filters.priceMin != null) {
      searchDto.priceMin = filters.priceMin;
    }
    if (filters.priceMax != null) {
      searchDto.priceMax = filters.priceMax;
    }
    if (filters.query) {
      searchDto.query = filters.query;
    }
    searchDto.limit = config.limit;
    searchDto.page = 1;

    // Build geo context
    const needsGeo = filters.sortBy === SortOptionEnum.DISTANCE || filters.radiusKm != null;
    let geoContext: ResolvedGeoContext;
    if (needsGeo && params.latitude != null && params.longitude != null) {
      geoContext = { mode: 'center', centerLat: params.latitude, centerLng: params.longitude };
    } else {
      geoContext = { mode: 'none' };
    }

    // Build extra filters
    const extraFilters: Prisma.Sql[] = [];
    if (filters.openToday) {
      const today = new Date().toISOString().slice(0, 10);
      const openFilter = this.searchQueryBuilder.buildOpenOnDateFilter(today);
      if (openFilter) {
        extraFilters.push(openFilter);
      }
    }

    const result = await this.searchQueryBuilder.runSearch({
      dto: searchDto,
      geoContext,
      radiusKm: filters.radiusKm,
      page: 1,
      limit: config.limit,
      sortBy: searchDto.sortBy,
      extraFilters: extraFilters.length > 0 ? extraFilters : undefined,
    });

    return {
      id: config.id,
      type: config.type,
      title: config.title,
      emoji: config.emoji,
      items: result.items.map((row) => mapSearchRowToCard(row)),
    };
  }
}
