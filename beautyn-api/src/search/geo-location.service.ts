import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { SearchRequestDto, SearchViewportDto } from './dto/search-request.dto';
import { LocationType } from './enums/location-type.enum';

export const DEFAULT_RADIUS_KM = 3;
export const MAX_RADIUS_KM = 15;
export const MIN_RESULTS = 5;

export const BASE_RADIUS_BY_LOCATION_TYPE: Record<LocationType, number> = {
  city: 7,
  neighborhood: 3,
  address: 2,
  poi: 3,
  unknown: DEFAULT_RADIUS_KM,
};

export type GeoMode = 'viewport' | 'center' | 'geoip' | 'none';

export interface ViewportGeoContext {
  mode: 'viewport';
  viewport: SearchViewportDto;
  centerLat: number;
  centerLng: number;
}

export interface CenterGeoContext {
  mode: 'center' | 'geoip';
  centerLat: number;
  centerLng: number;
  locationType?: LocationType;
}

export interface NoGeoContext {
  mode: 'none';
}

export type ResolvedGeoContext = ViewportGeoContext | CenterGeoContext | NoGeoContext;

@Injectable()
export class GeoLocationService {
  resolveGeoContext(req: Request, dto: SearchRequestDto): ResolvedGeoContext {
    if (dto.viewport?.neLat !== undefined && dto.viewport?.neLng !== undefined) {
      const center = this.getViewportCenter(dto.viewport);
      return { mode: 'viewport', viewport: dto.viewport, centerLat: center.lat, centerLng: center.lng };
    }

    if (dto.centerLat !== undefined && dto.centerLng !== undefined) {
      return {
        mode: 'center',
        centerLat: dto.centerLat,
        centerLng: dto.centerLng,
        locationType: dto.locationType,
      };
    }

    const geoIp = this.resolveGeoIpFallback(req);
    if (geoIp) {
      return geoIp;
    }

    return { mode: 'none' };
  }

  getBaseRadius(locationType?: LocationType): number {
    if (locationType && BASE_RADIUS_BY_LOCATION_TYPE[locationType] !== undefined) {
      return BASE_RADIUS_BY_LOCATION_TYPE[locationType];
    }
    return DEFAULT_RADIUS_KM;
  }

  expandRadius(current: number): number {
    return Math.min(current * 2, MAX_RADIUS_KM);
  }

  getMaxRadius(): number {
    return MAX_RADIUS_KM;
  }

  getMinResults(): number {
    return MIN_RESULTS;
  }

  private getViewportCenter(viewport: SearchViewportDto): { lat: number; lng: number } {
    return {
      lat: (viewport.neLat + viewport.swLat) / 2,
      lng: (viewport.neLng + viewport.swLng) / 2,
    };
  }

  private resolveGeoIpFallback(req: Request): CenterGeoContext | null {
    // TODO: Integrate real Geo-IP provider. For now we stub it out to keep flow ready.
    void req;
    return null;
  }
}
