import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { SearchRequestDto } from './dto/search-request.dto';
import { SortOptionEnum } from './enums/sort-option.enum';
import { ResolvedGeoContext } from './geo-location.service';

export interface RawSearchRow {
  id: string;
  name: string | null;
  address_line: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  rating_avg: Prisma.Decimal | number | null;
  rating_count: number | null;
  distance_km?: number | null;
  min_price_cents?: number | null;
  max_price_cents?: number | null;
  open_hours_json?: unknown;
  total_count?: number | bigint;
}

export interface SearchQueryResult {
  items: RawSearchRow[];
  total: number;
}

@Injectable()
export class SearchQueryBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  async runSearch(params: {
    dto: SearchRequestDto;
    geoContext: ResolvedGeoContext;
    radiusKm?: number;
    page: number;
    limit: number;
    sortBy?: SortOptionEnum;
  }): Promise<SearchQueryResult> {
    const { dto, geoContext, radiusKm, page, limit } = params;
    const offset = (page - 1) * limit;
    const withClauses: Prisma.Sql[] = [];
    const joins: Prisma.Sql[] = [];
    const filters: Prisma.Sql[] = [Prisma.sql`s.deleted_at IS NULL`];

    const distanceExpr = this.buildDistanceExpression(geoContext);
    if (distanceExpr && (geoContext.mode === 'center' || geoContext.mode === 'geoip')) {
      filters.push(Prisma.sql`s.latitude IS NOT NULL AND s.longitude IS NOT NULL`);
      if (radiusKm !== undefined) {
        filters.push(Prisma.sql`${distanceExpr} <= ${radiusKm}`);
      }
    }

    if (geoContext.mode === 'viewport') {
      filters.push(
        Prisma.sql`s.latitude BETWEEN ${geoContext.viewport.swLat} AND ${geoContext.viewport.neLat}`,
      );
      filters.push(
        Prisma.sql`s.longitude BETWEEN ${geoContext.viewport.swLng} AND ${geoContext.viewport.neLng}`,
      );
    }

    if (dto.query) {
      const like = `%${dto.query}%`;
      filters.push(
        Prisma.sql`(s.name ILIKE ${like} OR s.city ILIKE ${like} OR s.address_line ILIKE ${like})`,
      );
    }

    if (dto.priceMin !== undefined) {
      filters.push(
        Prisma.sql`s.min_price_cents IS NOT NULL AND s.min_price_cents >= ${dto.priceMin * 100}`,
      );
    }
    if (dto.priceMax !== undefined) {
      filters.push(
        Prisma.sql`s.max_price_cents IS NOT NULL AND s.max_price_cents <= ${dto.priceMax * 100}`,
      );
    }

    if (dto.appCategoryIds?.length) {
      joins.push(
        Prisma.sql`JOIN categories c ON c.salon_id = s.id`,
      );
      joins.push(
        Prisma.sql`JOIN salon_category_mappings scm ON scm.salon_category_id = c.id AND scm.app_category_id IS NOT NULL`,
      );
      const ids = dto.appCategoryIds
        .map((id) => id?.trim())
        .filter((id): id is string => Boolean(id));
      if (ids.length) {
        const uuidArray = Prisma.sql`ARRAY[${Prisma.join(
          ids.map((id) => Prisma.sql`${id}`),
          ', ',
        )}]::uuid[]`;
        filters.push(Prisma.sql`scm.app_category_id = ANY(${uuidArray})`);
      }
    }

    const openHoursFilter = this.buildOpenHoursFilter(dto.date, dto.time);
    if (openHoursFilter) {
      filters.push(openHoursFilter);
    }

    const whereSql = filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}` : Prisma.sql``;
    const orderByParts = this.buildSort(params.sortBy, Boolean(distanceExpr));
    const orderBySql =
      orderByParts.length > 0
        ? Prisma.sql`ORDER BY ${Prisma.join(orderByParts, ', ')}`
        : Prisma.sql``;

    const withSql = withClauses.length ? Prisma.sql`WITH ${Prisma.join(withClauses, ', ')}` : Prisma.sql``;
    const joinsSql = joins.length ? Prisma.sql`${Prisma.join(joins, ' ')}` : Prisma.sql``;
    const query = Prisma.sql`
      ${withSql}
      SELECT
        s.id,
        s.name,
        s.address_line,
        s.city,
        s.latitude,
        s.longitude,
        s.cover_image_url,
        s.images_count,
        s.rating_avg,
        s.rating_count,
        s.min_price_cents,
        s.max_price_cents
        ${distanceExpr ? Prisma.sql`, ${distanceExpr} AS distance_km` : Prisma.sql``},
        s.open_hours_json,
        COUNT(*) OVER() AS total_count
      FROM salons s
      ${joinsSql}
      ${whereSql}
      ${orderBySql}
      LIMIT ${limit} OFFSET ${offset}
    `;

    const rows = await this.prisma.$queryRaw<RawSearchRow[]>(query);
    const total = rows[0]?.total_count ? Number(rows[0].total_count) : 0;

    return { items: rows, total };
  }

  async findSuggestions(query: string, limit: number): Promise<RawSearchRow[]> {
    const like = `%${query}%`;
    const rows = await this.prisma.$queryRaw<RawSearchRow[]>(Prisma.sql`
      SELECT
        s.id,
        s.name,
        s.city,
        s.cover_image_url,
        s.rating_avg,
        s.rating_count
      FROM salons s
      WHERE s.deleted_at IS NULL
        AND (s.name ILIKE ${like} OR s.city ILIKE ${like})
      ORDER BY s.name ASC
      LIMIT ${limit}
    `);
    return rows;
  }

  private buildDistanceExpression(geoContext: ResolvedGeoContext): Prisma.Sql | null {
    if (geoContext.mode === 'center' || geoContext.mode === 'geoip' || geoContext.mode === 'viewport') {
      const centerLat = geoContext.centerLat;
      const centerLng = geoContext.centerLng;
      return Prisma.sql`
        6371 * acos(
          cos(radians(${centerLat})) * cos(radians(s.latitude)) *
          cos(radians(s.longitude) - radians(${centerLng})) +
          sin(radians(${centerLat})) * sin(radians(s.latitude))
        )
      `;
    }
    return null;
  }

  private buildSort(sortBy: SortOptionEnum | undefined, hasDistance: boolean): Prisma.Sql[] {
    const order: Prisma.Sql[] = [];
    const key = sortBy ?? (hasDistance ? SortOptionEnum.DISTANCE : SortOptionEnum.RATING_DESC);

    switch (key) {
      case SortOptionEnum.DISTANCE:
        if (hasDistance) {
          order.push(Prisma.sql`distance_km ASC`);
        }
        order.push(Prisma.sql`s.rating_avg DESC NULLS LAST`, Prisma.sql`s.rating_count DESC NULLS LAST`);
        break;
      case SortOptionEnum.RATING_DESC:
        order.push(Prisma.sql`s.rating_avg DESC NULLS LAST`, Prisma.sql`s.rating_count DESC NULLS LAST`);
        break;
      case SortOptionEnum.PRICE_ASC:
        order.push(Prisma.sql`s.min_price_cents ASC NULLS LAST`);
        break;
      case SortOptionEnum.PRICE_DESC:
        order.push(Prisma.sql`s.min_price_cents DESC NULLS LAST`);
        break;
      case SortOptionEnum.POPULAR:
        order.push(Prisma.sql`s.rating_count DESC NULLS LAST`, Prisma.sql`s.rating_avg DESC NULLS LAST`);
        break;
      default:
        order.push(Prisma.sql`s.rating_avg DESC NULLS LAST`, Prisma.sql`s.rating_count DESC NULLS LAST`);
        break;
    }

    order.push(Prisma.sql`s.created_at DESC`);
    return order;
  }

  private buildOpenHoursFilter(date?: string, time?: string): Prisma.Sql | null {
    if (!date || !time) return null;
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return null;
    const weekday = parsedDate.getUTCDay();
    return Prisma.sql`
      (
        s.open_hours_json IS NULL
        OR (
          jsonb_typeof(s.open_hours_json::jsonb) = 'array'
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(s.open_hours_json::jsonb) AS elem
            WHERE (elem->>'day')::int = ${weekday}
              AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(COALESCE(elem->'periods', '[]'::jsonb)) AS period
                WHERE ${time} >= (period->>'start') AND ${time} <= (period->>'end')
              )
          )
        )
      )
    `;
  }
}
