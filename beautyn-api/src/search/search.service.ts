import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { SearchRequestDto } from './dto/search-request.dto';
import { SearchResponseDto, SearchResultDto } from './dto/search-response.dto';
import { GeoLocationService, ResolvedGeoContext } from './geo-location.service';
import { SearchQueryBuilderService } from './search-query-builder.service';
import { SortOptionEnum } from './enums/sort-option.enum';

@Injectable()
export class SearchService {
  constructor(
    private readonly geo: GeoLocationService,
    private readonly queryBuilder: SearchQueryBuilderService,
  ) {}

  async search(req: Request, dto: SearchRequestDto): Promise<SearchResultDto> {
    const page = this.normalizePage(dto.page);
    const limit = this.normalizeLimit(dto.limit);
    const geoContext = this.geo.resolveGeoContext(req, dto);

    const { result, effectiveRadiusKm } = await this.runWithGeo(dto, geoContext, page, limit);
    const response: SearchResultDto = {
      items: result.items.map((row) => this.mapRow(row)),
      page,
      limit,
      total: result.total,
    };

    const meta: Record<string, any> = {};
    if (effectiveRadiusKm !== undefined) {
      meta.effective_radius_km = effectiveRadiusKm;
    }
    meta.geo_source = this.getGeoSource(geoContext);
    if (Object.keys(meta).length) {
      response.meta = meta;
    }

    return response;
  }

  private async runWithGeo(
    dto: SearchRequestDto,
    geoContext: ResolvedGeoContext,
    page: number,
    limit: number,
  ): Promise<{ result: Awaited<ReturnType<SearchQueryBuilderService['runSearch']>>; effectiveRadiusKm?: number }> {
    if (geoContext.mode === 'center' || geoContext.mode === 'geoip') {
      const minResults = this.geo.getMinResults();
      const maxRadius = this.geo.getMaxRadius();
      // Explicitly passing undefined to getBaseRadius if both geoContext.locationType and dto.locationType are undefined.
      let radiusKm = this.geo.getBaseRadius(geoContext.locationType ?? dto.locationType);
      let result = await this.queryBuilder.runSearch({
        dto,
        geoContext,
        radiusKm,
        page,
        limit,
        sortBy: dto.sortBy ?? SortOptionEnum.DISTANCE,
      });
      while (result.total < minResults && radiusKm < maxRadius) {
        const nextRadius = this.geo.expandRadius(radiusKm);
        if (nextRadius === radiusKm) break;
        radiusKm = nextRadius;
        result = await this.queryBuilder.runSearch({
          dto,
          geoContext,
          radiusKm,
          page,
          limit,
          sortBy: dto.sortBy ?? SortOptionEnum.DISTANCE,
        });
      }
      return { result, effectiveRadiusKm: radiusKm };
    }

    const result = await this.queryBuilder.runSearch({
      dto,
      geoContext,
      page,
      limit,
      sortBy: dto.sortBy,
    });
    return { result };
  }

  private mapRow(row: any): SearchResponseDto {
    const rating = row.rating_avg !== undefined && row.rating_avg !== null ? Number(row.rating_avg) : undefined;
    const distanceKm = row.distance_km !== undefined && row.distance_km !== null ? Number(row.distance_km) : undefined;
    const latitude = row.latitude !== undefined && row.latitude !== null ? Number(row.latitude) : undefined;
    const longitude = row.longitude !== undefined && row.longitude !== null ? Number(row.longitude) : undefined;
    return {
      salon_id: row.id,
      name: row.name ?? '',
      address: this.composeAddress(row.city, row.address_line),
      rating,
      distance_km: distanceKm,
      logo_url: row.cover_image_url ?? undefined,
      latitude,
      longitude,
      image_url: row.cover_image_url ?? undefined,
    };
  }

  private composeAddress(city?: string | null, address?: string | null): string {
    if (city && address) return `${city}, ${address}`;
    return city ?? address ?? '';
  }

  private normalizePage(page?: number): number {
    const value = Number(page ?? 1);
    if (Number.isNaN(value) || value < 1) return 1;
    return Math.floor(value);
  }

  private normalizeLimit(limit?: number): number {
    const value = Number(limit ?? 20);
    if (Number.isNaN(value) || value < 1) return 20;
    return Math.min(Math.floor(value), 100);
  }

  private getGeoSource(geoContext: ResolvedGeoContext): 'viewport' | 'center' | 'geoip' | 'none' {
    switch (geoContext.mode) {
      case 'viewport':
        return 'viewport';
      case 'center':
        return 'center';
      case 'geoip':
        return 'geoip';
      default:
        return 'none';
    }
  }
}
