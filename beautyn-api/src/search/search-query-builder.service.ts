import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/database/prisma.service';
import { SearchRequestDto, SearchViewportDto } from './dto/search-request.dto';
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
    extraFilters?: Prisma.Sql[];
  }): Promise<SearchQueryResult> {
    const { dto, geoContext, radiusKm, page, limit } = params;
    const offset = (page - 1) * limit;
    const withClauses: Prisma.Sql[] = [];
    const joins: Prisma.Sql[] = [];
    const filters: Prisma.Sql[] = [Prisma.sql`s.deleted_at IS NULL`];

    const distanceExpr = this.buildDistanceExpression(geoContext);
    if (distanceExpr && (geoContext.mode === 'center' || geoContext.mode === 'geoip')) {
      filters.push(Prisma.sql`s.latitude IS NOT NULL AND s.longitude IS NOT NULL`);
      // Apply a coarse bounding box first to reduce rows before expensive trig distance calc
      if (params.radiusKm !== undefined) {
        const bbox = this.computeBoundingBox(geoContext.centerLat, geoContext.centerLng, params.radiusKm);
        filters.push(Prisma.sql`s.latitude BETWEEN ${bbox.minLat} AND ${bbox.maxLat}`);
        if (!bbox.wrapsLongitude) {
          filters.push(Prisma.sql`s.longitude BETWEEN ${bbox.minLng} AND ${bbox.maxLng}`);
        } else {
          filters.push(
            Prisma.sql`(s.longitude >= ${bbox.minLng} OR s.longitude <= ${bbox.maxLng})`,
          );
        }
      }
      if (radiusKm !== undefined) {
        filters.push(Prisma.sql`${distanceExpr} <= ${radiusKm}`);
      }
    }

    if (geoContext.mode === 'viewport') {
      const radiusForBBox = this.estimateViewportRadiusKm(geoContext.viewport);
      const bbox = this.computeBoundingBox(geoContext.centerLat, geoContext.centerLng, radiusForBBox);
      filters.push(Prisma.sql`s.latitude BETWEEN ${bbox.minLat} AND ${bbox.maxLat}`);
      if (!bbox.wrapsLongitude) {
        filters.push(Prisma.sql`s.longitude BETWEEN ${bbox.minLng} AND ${bbox.maxLng}`);
      } else {
        filters.push(Prisma.sql`(s.longitude >= ${bbox.minLng} OR s.longitude <= ${bbox.maxLng})`);
      }
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

    const hasCategoryFilter = Boolean(dto.appCategoryIds?.length);
    if (hasCategoryFilter) {
      joins.push(
        Prisma.sql`JOIN categories c ON c.salon_id = s.id`,
      );
      joins.push(
        Prisma.sql`JOIN salon_category_mappings scm ON scm.salon_category_id = c.id AND scm.app_category_id IS NOT NULL`,
      );
      const ids = (dto.appCategoryIds ?? [])
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

    if (params.extraFilters?.length) {
      filters.push(...params.extraFilters);
    }

    const whereSql = filters.length ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}` : Prisma.sql``;
    const joinsSql = joins.length ? Prisma.sql`${Prisma.join(joins, ' ')}` : Prisma.sql``;
    const selectColumns: Prisma.Sql[] = [
      Prisma.sql`s.id`,
      Prisma.sql`s.name`,
      Prisma.sql`s.address_line`,
      Prisma.sql`s.city`,
      Prisma.sql`s.latitude`,
      Prisma.sql`s.longitude`,
      Prisma.sql`s.cover_image_url`,
      Prisma.sql`s.images_count`,
      Prisma.sql`s.rating_avg`,
      Prisma.sql`s.rating_count`,
      Prisma.sql`s.min_price_cents`,
      Prisma.sql`s.max_price_cents`,
      Prisma.sql`s.created_at`,
    ];

    if (distanceExpr) {
      selectColumns.push(Prisma.sql`${distanceExpr} AS distance_km`);
    }

    selectColumns.push(Prisma.sql`s.open_hours_json`);

    let query: Prisma.Sql;

    if (hasCategoryFilter) {
      const orderByInner = this.buildSort(params.sortBy, Boolean(distanceExpr), false, 's', distanceExpr ?? undefined);
      const orderByOuter = this.buildSort(params.sortBy, Boolean(distanceExpr), false, 'f');
      const windowOrder =
        orderByInner.length > 0 ? Prisma.join(orderByInner, ', ') : Prisma.sql`s.id ASC`;

      const selectWithRowNumber = Prisma.join(
        [...selectColumns, Prisma.sql`ROW_NUMBER() OVER (PARTITION BY s.id ORDER BY ${windowOrder}) AS rn`],
        ', ',
      );

      const baseSelect = Prisma.sql`
        SELECT ${selectWithRowNumber}
        FROM salons s
        ${joinsSql}
        ${whereSql}
      `;

      const ctes = [
        ...withClauses,
        Prisma.sql`filtered AS (SELECT * FROM (${baseSelect}) AS base WHERE base.rn = 1)`,
        Prisma.sql`total AS (SELECT COUNT(*) AS total_count FROM filtered)`,
      ];
      const withSql = Prisma.sql`WITH ${Prisma.join(ctes, ', ')}`;

      const orderBySqlOuter =
        orderByOuter.length > 0 ? Prisma.sql`ORDER BY ${Prisma.join(orderByOuter, ', ')}` : Prisma.sql``;

      query = Prisma.sql`
        ${withSql}
        SELECT f.*, t.total_count
        FROM filtered f CROSS JOIN total t
        ${orderBySqlOuter}
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      const orderByInner = this.buildSort(params.sortBy, Boolean(distanceExpr), false, 's');
      const orderBySqlInner =
        orderByInner.length > 0 ? Prisma.sql`ORDER BY ${Prisma.join(orderByInner, ', ')}` : Prisma.sql``;
      const withSql = withClauses.length ? Prisma.sql`WITH ${Prisma.join(withClauses, ', ')}` : Prisma.sql``;

      selectColumns.push(Prisma.sql`COUNT(*) OVER() AS total_count`);
      const selectSql = Prisma.join(selectColumns, ', ');

      query = Prisma.sql`
        ${withSql}
        SELECT
          ${selectSql}
        FROM salons s
        ${joinsSql}
        ${whereSql}
        ${orderBySqlInner}
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

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

  private computeBoundingBox(
    centerLat: number,
    centerLng: number,
    radiusKm: number,
  ): { minLat: number; maxLat: number; minLng: number; maxLng: number; wrapsLongitude: boolean } {
    const kmPerDegreeLat = 111.32;
    const latDelta = radiusKm / kmPerDegreeLat;
    const latRad = (centerLat * Math.PI) / 180;
    const kmPerDegreeLng = Math.max(Math.cos(latRad) * kmPerDegreeLat, 0);
    const lngDelta = kmPerDegreeLng > 0 ? radiusKm / kmPerDegreeLng : 180;

    let minLat = Math.max(centerLat - latDelta, -90);
    let maxLat = Math.min(centerLat + latDelta, 90);

    let minLngRaw = centerLng - lngDelta;
    let maxLngRaw = centerLng + lngDelta;

    const normalizeLng = (lng: number): number => {
      let x = lng;
      while (x < -180) x += 360;
      while (x > 180) x -= 360;
      return x;
    };

    const wrapsLongitude = minLngRaw < -180 || maxLngRaw > 180;
    const minLng = normalizeLng(minLngRaw);
    const maxLng = normalizeLng(maxLngRaw);

    return { minLat, maxLat, minLng, maxLng, wrapsLongitude };
  }

  private buildSort(
    sortBy: SortOptionEnum | undefined,
    hasDistance: boolean,
    hasDistinct: boolean,
    alias: string = 's',
    distanceExprOverride?: Prisma.Sql,
  ): Prisma.Sql[] {
    const order: Prisma.Sql[] = [];
    const col = (name: string) => Prisma.raw(`${alias ? `${alias}.` : ''}${name}`);

    if (hasDistinct) {
      order.push(Prisma.sql`${col('id')} ASC`);
    }
    const key = sortBy ?? (hasDistance ? SortOptionEnum.DISTANCE : SortOptionEnum.RATING_DESC);

    switch (key) {
      case SortOptionEnum.DISTANCE:
        if (hasDistance) {
          if (distanceExprOverride) {
            order.push(Prisma.sql`${distanceExprOverride} ASC`);
          } else {
            // distance_km is a select alias; do not prefix with table alias
            order.push(Prisma.sql`distance_km ASC`);
          }
        }
        order.push(
          Prisma.sql`${col('rating_avg')} DESC NULLS LAST`,
          Prisma.sql`${col('rating_count')} DESC NULLS LAST`,
        );
        break;
      case SortOptionEnum.RATING_DESC:
        order.push(
          Prisma.sql`${col('rating_avg')} DESC NULLS LAST`,
          Prisma.sql`${col('rating_count')} DESC NULLS LAST`,
        );
        break;
      case SortOptionEnum.PRICE_ASC:
        order.push(Prisma.sql`${col('min_price_cents')} ASC NULLS LAST`);
        break;
      case SortOptionEnum.PRICE_DESC:
        order.push(Prisma.sql`${col('min_price_cents')} DESC NULLS LAST`);
        break;
      case SortOptionEnum.POPULAR:
        order.push(
          Prisma.sql`${col('rating_count')} DESC NULLS LAST`,
          Prisma.sql`${col('rating_avg')} DESC NULLS LAST`,
        );
        break;
      default:
        order.push(
          Prisma.sql`${col('rating_avg')} DESC NULLS LAST`,
          Prisma.sql`${col('rating_count')} DESC NULLS LAST`,
        );
        break;
    }

    if (!hasDistinct) {
      order.push(Prisma.sql`${col('id')} ASC`);
    }
    order.push(Prisma.sql`${col('created_at')} DESC`);
    return order;
  }

  buildOpenOnDateFilter(date: string): Prisma.Sql | null {
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
              AND jsonb_array_length(COALESCE(elem->'periods', '[]'::jsonb)) > 0
          )
        )
      )
    `;
  }

  private buildOpenHoursFilter(date?: string, time?: string): Prisma.Sql | null {
    if (!date || !time) return null;
    const parsedDate = new Date(date);
    if (Number.isNaN(parsedDate.getTime())) return null;
    const normalizedTime = this.normalizeTime(time);
    if (!normalizedTime) return null;
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
                WHERE ${normalizedTime} >= LPAD(period->>'start', 5, '0') AND ${normalizedTime} <= LPAD(period->>'end', 5, '0')
              )
          )
        )
      )
    `;
  }

  private normalizeTime(value: string): string | null {
    const parts = value.split(':');
    if (parts.length !== 2) return null;
    const [h, m] = parts;
    const hour = Number(h);
    const minute = Number(m);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    const hh = hour.toString().padStart(2, '0');
    const mm = minute.toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private estimateViewportRadiusKm(viewport: SearchViewportDto): number {
    const centerLat = (viewport.neLat + viewport.swLat) / 2;
    const centerLng = (viewport.neLng + viewport.swLng) / 2;
    const corners = [
      { lat: viewport.neLat, lng: viewport.neLng },
      { lat: viewport.neLat, lng: viewport.swLng },
      { lat: viewport.swLat, lng: viewport.neLng },
      { lat: viewport.swLat, lng: viewport.swLng },
    ];
    const distances = corners.map((c) => this.haversineKm(centerLat, centerLng, c.lat, c.lng));
    const maxCorner = Math.max(...distances);
    // Use the furthest corner plus a small buffer
    return Math.max(maxCorner, 0.1);
  }

  private haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
