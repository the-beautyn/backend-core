import { SearchService } from '../../src/search/search.service';
import { GeoLocationService, ResolvedGeoContext } from '../../src/search/geo-location.service';
import { SearchQueryBuilderService } from '../../src/search/search-query-builder.service';
import { SearchRequestDto } from '../../src/search/dto/search-request.dto';

describe('SearchService', () => {
  const makeReq = () => ({ headers: {} }) as any;

  it('auto-expands radius until min results reached', async () => {
    const geoContext: ResolvedGeoContext = { mode: 'center', centerLat: 1, centerLng: 2 };
    const mockGeo = {
      resolveGeoContext: jest.fn().mockReturnValue(geoContext),
      getMinResults: jest.fn().mockReturnValue(5),
      getMaxRadius: jest.fn().mockReturnValue(15),
      getBaseRadius: jest.fn().mockReturnValue(3),
      expandRadius: jest.fn().mockImplementation((r: number) => Math.min(r * 2, 15)),
    } as unknown as GeoLocationService;

    const mockQueryBuilder = {
      runSearch: jest
        .fn()
        .mockResolvedValueOnce({ items: [], total: 2 })
        .mockResolvedValueOnce({ items: [{ id: 's1', city: 'Kyiv' }], total: 6 }),
    } as unknown as SearchQueryBuilderService;

    const service = new SearchService(mockGeo, mockQueryBuilder);
    const result = await service.search(makeReq(), new SearchRequestDto());

    expect(mockQueryBuilder.runSearch).toHaveBeenCalledTimes(2);
    expect((mockQueryBuilder.runSearch as jest.Mock).mock.calls[0][0]).toMatchObject({ radiusKm: 3 });
    expect((mockQueryBuilder.runSearch as jest.Mock).mock.calls[1][0]).toMatchObject({ radiusKm: 6 });
    expect(result.meta?.effective_radius_km).toBe(6);
  });

  it('runs once without geo context', async () => {
    const geoContext: ResolvedGeoContext = { mode: 'none' };
    const mockGeo = {
      resolveGeoContext: jest.fn().mockReturnValue(geoContext),
      getMinResults: jest.fn(),
      getMaxRadius: jest.fn(),
      getBaseRadius: jest.fn(),
      expandRadius: jest.fn(),
    } as unknown as GeoLocationService;

    const mockQueryBuilder = {
      runSearch: jest.fn().mockResolvedValue({ items: [{ id: 's2', city: 'Lviv' }], total: 1 }),
    } as unknown as SearchQueryBuilderService;

    const service = new SearchService(mockGeo, mockQueryBuilder);
    const result = await service.search(makeReq(), new SearchRequestDto());

    expect(mockQueryBuilder.runSearch).toHaveBeenCalledTimes(1);
    expect(result.meta?.geo_source).toBe('none');
    expect(result.items[0].salon_id).toBe('s2');
  });
});
