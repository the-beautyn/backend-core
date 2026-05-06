import { SearchService } from '../../src/search/search.service';
import { GeoLocationService, ResolvedGeoContext } from '../../src/search/geo-location.service';
import { SearchQueryBuilderService } from '../../src/search/search-query-builder.service';
import { SavedSalonsService } from '../../src/saved-salons/saved-salons.service';
import { SearchRequestDto } from '../../src/search/dto/search-request.dto';

describe('SearchService', () => {
  const makeReq = () => ({ headers: {} }) as any;

  const makeSavedSalons = (overrides: Partial<SavedSalonsService> = {}) =>
    ({
      isSavedBatch: jest.fn().mockResolvedValue(new Set<string>()),
      ...overrides,
    }) as unknown as SavedSalonsService;

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

    const service = new SearchService(mockGeo, mockQueryBuilder, makeSavedSalons());
    const result = await service.search(makeReq(), new SearchRequestDto(), null);

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

    const service = new SearchService(mockGeo, mockQueryBuilder, makeSavedSalons());
    const result = await service.search(makeReq(), new SearchRequestDto(), null);

    expect(mockQueryBuilder.runSearch).toHaveBeenCalledTimes(1);
    expect(result.meta?.geo_source).toBe('none');
    expect(result.items[0].salon_id).toBe('s2');
  });

  describe('is_saved decoration', () => {
    const noneGeo: ResolvedGeoContext = { mode: 'none' };
    const makeGeo = () =>
      ({
        resolveGeoContext: jest.fn().mockReturnValue(noneGeo),
        getMinResults: jest.fn(),
        getMaxRadius: jest.fn(),
        getBaseRadius: jest.fn(),
        expandRadius: jest.fn(),
      }) as unknown as GeoLocationService;

    it('does not call isSavedBatch and leaves is_saved undefined for anonymous caller', async () => {
      const mockQueryBuilder = {
        runSearch: jest.fn().mockResolvedValue({
          items: [
            { id: 'salon-A', city: 'Kyiv' },
            { id: 'salon-B', city: 'Lviv' },
          ],
          total: 2,
        }),
      } as unknown as SearchQueryBuilderService;

      const savedSalons = makeSavedSalons();
      const service = new SearchService(makeGeo(), mockQueryBuilder, savedSalons);

      const result = await service.search(makeReq(), new SearchRequestDto(), null);

      expect(savedSalons.isSavedBatch).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(2);
      for (const item of result.items) {
        expect(item.is_saved).toBeUndefined();
      }
    });

    it('marks is_saved per row using isSavedBatch result for authenticated caller', async () => {
      const mockQueryBuilder = {
        runSearch: jest.fn().mockResolvedValue({
          items: [
            { id: 'salon-A', city: 'Kyiv' },
            { id: 'salon-B', city: 'Lviv' },
            { id: 'salon-C', city: 'Odesa' },
          ],
          total: 3,
        }),
      } as unknown as SearchQueryBuilderService;

      const savedSalons = makeSavedSalons({
        isSavedBatch: jest.fn().mockResolvedValue(new Set(['salon-A', 'salon-C'])),
      } as Partial<SavedSalonsService>);
      const service = new SearchService(makeGeo(), mockQueryBuilder, savedSalons);

      const result = await service.search(makeReq(), new SearchRequestDto(), 'user-123');

      expect(savedSalons.isSavedBatch).toHaveBeenCalledWith('user-123', ['salon-A', 'salon-B', 'salon-C']);
      const byId = (id: string) => result.items.find((i) => i.salon_id === id)!;
      expect(byId('salon-A').is_saved).toBe(true);
      expect(byId('salon-B').is_saved).toBe(false);
      expect(byId('salon-C').is_saved).toBe(true);
    });

    it('does not call isSavedBatch when result set is empty', async () => {
      const mockQueryBuilder = {
        runSearch: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      } as unknown as SearchQueryBuilderService;

      const savedSalons = makeSavedSalons();
      const service = new SearchService(makeGeo(), mockQueryBuilder, savedSalons);

      const result = await service.search(makeReq(), new SearchRequestDto(), 'user-123');

      expect(savedSalons.isSavedBatch).not.toHaveBeenCalled();
      expect(result.items).toEqual([]);
    });
  });
});
