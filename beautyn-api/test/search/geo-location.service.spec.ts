import { GeoLocationService } from '../../src/search/geo-location.service';
import { SearchRequestDto } from '../../src/search/dto/search-request.dto';

describe('GeoLocationService', () => {
  let service: GeoLocationService;

  beforeEach(() => {
    service = new GeoLocationService();
  });

  it('returns viewport mode and center when viewport provided', () => {
    const dto = {
      viewport: { neLat: 50, neLng: 30, swLat: 48, swLng: 28 },
    } as unknown as SearchRequestDto;

    const ctx = service.resolveGeoContext({} as any, dto);

    expect(ctx.mode).toBe('viewport');
    if (ctx.mode === 'viewport') {
      expect(ctx.centerLat).toBe(49);
      expect(ctx.centerLng).toBe(29);
    }
  });

  it('returns center mode when centerLat/centerLng provided', () => {
    const dto = { centerLat: 40.1, centerLng: -73.5, locationType: 'city' } as SearchRequestDto;
    const ctx = service.resolveGeoContext({} as any, dto);
    expect(ctx).toEqual({
      mode: 'center',
      centerLat: 40.1,
      centerLng: -73.5,
      locationType: 'city',
    });
  });

  it('falls back to none when no geo provided', () => {
    const ctx = service.resolveGeoContext({} as any, {} as SearchRequestDto);
    expect(ctx).toEqual({ mode: 'none' });
  });

  it('expands radius up to the configured maximum', () => {
    const first = service.expandRadius(3);
    expect(first).toBe(6);
    const capped = service.expandRadius(service.getMaxRadius());
    expect(capped).toBe(service.getMaxRadius());
  });
});
