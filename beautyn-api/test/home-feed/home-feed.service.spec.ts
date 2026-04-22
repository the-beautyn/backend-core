import { HomeFeedService } from '../../src/home-feed/home-feed.service';

describe('HomeFeedService', () => {
  const searchRow = (overrides: any = {}) => ({
    id: 'salon-1',
    name: 'Beauty Palace',
    cover_image_url: 'https://img.test/1.jpg',
    address_line: '1 Main St',
    city: 'Kyiv',
    rating_avg: 4.5,
    rating_count: 100,
    distance_km: null,
    total_count: 1,
    ...overrides,
  });

  const prisma = {
    booking: { findFirst: jest.fn() },
  } as any;

  const sectionConfigRepo = {
    listActive: jest.fn(),
  } as any;

  const appCategoriesService = {
    list: jest.fn(),
  } as any;

  const savedSalonsService = {
    listByUser: jest.fn(),
    isSavedBatch: jest.fn(),
  } as any;

  const searchQueryBuilder = {
    runSearch: jest.fn(),
    buildOpenOnDateFilter: jest.fn(),
  } as any;

  const service = new HomeFeedService(
    prisma,
    sectionConfigRepo,
    appCategoriesService,
    savedSalonsService,
    searchQueryBuilder,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    sectionConfigRepo.listActive.mockResolvedValue([]);
    appCategoriesService.list.mockResolvedValue({ items: [] });
  });

  describe('unauthorized user', () => {
    it('returns categories and sections for unauthorized user', async () => {
      const categories = [
        { id: 'c1', slug: 'nails', name: 'Nails', imageUrl: null, keywords: [], isActive: true },
      ];
      appCategoriesService.list.mockResolvedValue({ items: categories });

      const result = await service.getHomeFeed({ userId: null });

      expect(result.categories).toEqual(categories);
      expect(result.next_booking).toBeUndefined();
      expect(result.saved_salons).toBeUndefined();
      expect(result.sections).toEqual([]);
      expect(appCategoriesService.list).toHaveBeenCalledWith({ onlyActive: true });
    });

    it('does not fetch saved salons or bookings for unauthorized user', async () => {
      appCategoriesService.list.mockResolvedValue({ items: [] });

      await service.getHomeFeed({ userId: null });

      expect(savedSalonsService.listByUser).not.toHaveBeenCalled();
      expect(prisma.booking.findFirst).not.toHaveBeenCalled();
      expect(savedSalonsService.isSavedBatch).not.toHaveBeenCalled();
    });
  });

  describe('authorized user', () => {
    it('returns nextBooking and savedSalons for authorized user', async () => {
      const bookingDate = new Date('2026-04-01T10:00:00Z');
      prisma.booking.findFirst.mockResolvedValue({
        id: 'b1',
        salonId: 'salon-1',
        datetime: bookingDate,
        endDatetime: new Date('2026-04-01T11:00:00Z'),
        salon: { name: 'Beauty Palace', coverImageUrl: 'https://img.test/1.jpg', addressLine: '1 Main St' },
      });

      savedSalonsService.listByUser.mockResolvedValue({
        items: [{ id: 'ss1', salon_id: 'salon-1', salon_name: 'Beauty Palace', saved_at: '2026-03-01' }],
      });

      const result = await service.getHomeFeed({ userId: 'user-1' });

      expect(result.next_booking).toBeDefined();
      expect(result.next_booking!.booking_id).toBe('b1');
      expect(result.next_booking!.salon_name).toBe('Beauty Palace');
      expect(result.next_booking!.datetime).toBe(bookingDate.toISOString());
      expect(result.saved_salons).toHaveLength(1);
      expect(result.categories).toEqual([]);
    });

    it('returns null nextBooking when no upcoming bookings', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      savedSalonsService.listByUser.mockResolvedValue({ items: [] });

      const result = await service.getHomeFeed({ userId: 'user-1' });

      expect(result.next_booking).toBeNull();
    });

    it('marks isSaved on salon cards for authorized user', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      savedSalonsService.listByUser.mockResolvedValue({ items: [] });

      sectionConfigRepo.listActive.mockResolvedValue([
        { id: 'sec1', type: 'popular', title: 'Popular', emoji: null, limit: 10, sortOrder: 0, filters: { sortBy: 'popular' } },
      ]);
      searchQueryBuilder.runSearch.mockResolvedValue({
        items: [searchRow(), searchRow({ id: 'salon-2', name: 'Glamour Studio' })],
        total: 2,
      });
      savedSalonsService.isSavedBatch.mockResolvedValue(new Set(['salon-1']));

      const result = await service.getHomeFeed({ userId: 'user-1' });

      expect(result.sections).toHaveLength(1);
      const items = result.sections[0].items;
      expect(items).toHaveLength(2);
      expect(items.find((i: any) => i.id === 'salon-1')!.is_saved).toBe(true);
      expect(items.find((i: any) => i.id === 'salon-2')!.is_saved).toBe(false);
    });

    it('does not call isSavedBatch when no salon items', async () => {
      prisma.booking.findFirst.mockResolvedValue(null);
      savedSalonsService.listByUser.mockResolvedValue({ items: [] });

      const result = await service.getHomeFeed({ userId: 'user-1' });

      expect(savedSalonsService.isSavedBatch).not.toHaveBeenCalled();
      expect(result.sections).toEqual([]);
    });
  });

  describe('sections via SearchQueryBuilderService', () => {
    it('builds section with filters.sortBy=popular', async () => {
      appCategoriesService.list.mockResolvedValue({ items: [] });
      sectionConfigRepo.listActive.mockResolvedValue([
        { id: 'sec1', type: 'popular', title: 'Popular', emoji: '🔥', limit: 5, sortOrder: 0, filters: { sortBy: 'popular' } },
      ]);
      searchQueryBuilder.runSearch.mockResolvedValue({ items: [searchRow()], total: 1 });

      const result = await service.getHomeFeed({ userId: null });

      expect(result.sections).toHaveLength(1);
      expect(result.sections[0].type).toBe('popular');
      expect(result.sections[0].items).toHaveLength(1);
      expect(result.sections[0].items[0].name).toBe('Beauty Palace');

      expect(searchQueryBuilder.runSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 5,
          sortBy: 'popular',
          geoContext: { mode: 'none' },
        }),
      );
    });

    it('builds section with filters.appCategoryId', async () => {
      appCategoriesService.list.mockResolvedValue({ items: [] });
      sectionConfigRepo.listActive.mockResolvedValue([
        { id: 'sec2', type: 'category', title: 'Nails', emoji: '💅', limit: 10, sortOrder: 1, filters: { appCategoryId: 'cat1' } },
      ]);
      searchQueryBuilder.runSearch.mockResolvedValue({ items: [searchRow()], total: 1 });

      await service.getHomeFeed({ userId: null });

      expect(searchQueryBuilder.runSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          dto: expect.objectContaining({ appCategoryIds: ['cat1'] }),
        }),
      );
    });

    it('builds section with distance sort and geo params', async () => {
      appCategoriesService.list.mockResolvedValue({ items: [] });
      sectionConfigRepo.listActive.mockResolvedValue([
        { id: 'sec3', type: 'nearMe', title: 'Near Me', emoji: '📍', limit: 10, sortOrder: 2, filters: { sortBy: 'distance', radiusKm: 5 } },
      ]);
      searchQueryBuilder.runSearch.mockResolvedValue({
        items: [searchRow({ distance_km: 1.5 })],
        total: 1,
      });

      const result = await service.getHomeFeed({ userId: null, latitude: 50.45, longitude: 30.52 });

      expect(result.sections[0].items[0].distance_km).toBe(1.5);
      expect(searchQueryBuilder.runSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          geoContext: { mode: 'center', centerLat: 50.45, centerLng: 30.52 },
          radiusKm: 5,
          sortBy: 'distance',
        }),
      );
    });

    it('uses none geo context when no lat/lon provided for distance section', async () => {
      appCategoriesService.list.mockResolvedValue({ items: [] });
      sectionConfigRepo.listActive.mockResolvedValue([
        { id: 'sec4', type: 'nearMe', title: 'Near Me', emoji: null, limit: 10, sortOrder: 0, filters: { sortBy: 'distance' } },
      ]);
      searchQueryBuilder.runSearch.mockResolvedValue({ items: [], total: 0 });

      await service.getHomeFeed({ userId: null });

      expect(searchQueryBuilder.runSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          geoContext: { mode: 'none' },
        }),
      );
    });

    it('builds section with openToday filter', async () => {
      appCategoriesService.list.mockResolvedValue({ items: [] });
      sectionConfigRepo.listActive.mockResolvedValue([
        { id: 'sec5', type: 'category', title: 'Nails Today', emoji: '💅', limit: 10, sortOrder: 0, filters: { appCategoryId: 'cat1', openToday: true } },
      ]);
      const mockFilter = 'OPEN_TODAY_SQL';
      searchQueryBuilder.buildOpenOnDateFilter.mockReturnValue(mockFilter);
      searchQueryBuilder.runSearch.mockResolvedValue({ items: [], total: 0 });

      await service.getHomeFeed({ userId: null });

      expect(searchQueryBuilder.buildOpenOnDateFilter).toHaveBeenCalled();
      expect(searchQueryBuilder.runSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          extraFilters: [mockFilter],
        }),
      );
    });

    it('builds section with price filters', async () => {
      appCategoriesService.list.mockResolvedValue({ items: [] });
      sectionConfigRepo.listActive.mockResolvedValue([
        { id: 'sec6', type: 'deals', title: 'Budget', emoji: '💰', limit: 10, sortOrder: 0, filters: { sortBy: 'price_asc', priceMax: 500 } },
      ]);
      searchQueryBuilder.runSearch.mockResolvedValue({ items: [], total: 0 });

      await service.getHomeFeed({ userId: null });

      expect(searchQueryBuilder.runSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          dto: expect.objectContaining({ priceMax: 500, sortBy: 'price_asc' }),
        }),
      );
    });

    it('handles section with no filters', async () => {
      appCategoriesService.list.mockResolvedValue({ items: [] });
      sectionConfigRepo.listActive.mockResolvedValue([
        { id: 'sec7', type: 'all', title: 'All Salons', emoji: null, limit: 20, sortOrder: 0, filters: null },
      ]);
      searchQueryBuilder.runSearch.mockResolvedValue({ items: [searchRow()], total: 1 });

      const result = await service.getHomeFeed({ userId: null });

      expect(result.sections[0].items).toHaveLength(1);
    });

    it('handles multiple sections in correct order', async () => {
      appCategoriesService.list.mockResolvedValue({ items: [] });
      sectionConfigRepo.listActive.mockResolvedValue([
        { id: 'sec1', type: 'popular', title: 'Popular', emoji: null, limit: 5, sortOrder: 0, filters: { sortBy: 'popular' } },
        { id: 'sec2', type: 'category', title: 'Hair', emoji: null, limit: 5, sortOrder: 1, filters: { appCategoryId: 'cat2' } },
      ]);
      searchQueryBuilder.runSearch
        .mockResolvedValueOnce({ items: [searchRow()], total: 1 })
        .mockResolvedValueOnce({ items: [searchRow({ id: 'salon-2' })], total: 1 });

      const result = await service.getHomeFeed({ userId: null });

      expect(result.sections).toHaveLength(2);
      expect(result.sections[0].id).toBe('sec1');
      expect(result.sections[1].id).toBe('sec2');
    });
  });

  describe('salon card mapping from search rows', () => {
    it('handles null fields correctly', async () => {
      appCategoriesService.list.mockResolvedValue({ items: [] });
      sectionConfigRepo.listActive.mockResolvedValue([
        { id: 'sec1', type: 'all', title: 'All', emoji: null, limit: 10, sortOrder: 0, filters: null },
      ]);
      searchQueryBuilder.runSearch.mockResolvedValue({
        items: [searchRow({ name: null, cover_image_url: null, rating_avg: null, rating_count: null })],
        total: 1,
      });

      const result = await service.getHomeFeed({ userId: null });

      const card = result.sections[0].items[0];
      expect(card.rating_avg).toBeNull();
      expect(card.rating_count).toBeNull();
      expect(card.cover_image_url).toBeNull();
    });

    it('converts numeric rating_avg to number', async () => {
      appCategoriesService.list.mockResolvedValue({ items: [] });
      sectionConfigRepo.listActive.mockResolvedValue([
        { id: 'sec1', type: 'all', title: 'All', emoji: null, limit: 10, sortOrder: 0, filters: null },
      ]);
      searchQueryBuilder.runSearch.mockResolvedValue({
        items: [searchRow({ rating_avg: 4.2 })],
        total: 1,
      });

      const result = await service.getHomeFeed({ userId: null });

      expect(typeof result.sections[0].items[0].rating_avg).toBe('number');
      expect(result.sections[0].items[0].rating_avg).toBe(4.2);
    });
  });
});
