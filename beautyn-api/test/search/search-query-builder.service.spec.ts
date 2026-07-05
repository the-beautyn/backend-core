import { SearchQueryBuilderService } from '../../src/search/search-query-builder.service';
import { PrismaService } from '../../src/shared/database/prisma.service';

describe('SearchQueryBuilderService', () => {
  describe('runPriceBounds', () => {
    const makeService = (row: { min_cents: unknown; max_cents: unknown } | undefined) => {
      const prisma = {
        $queryRaw: jest.fn().mockResolvedValue(row ? [row] : []),
      } as unknown as PrismaService;
      return { service: new SearchQueryBuilderService(prisma), prisma };
    };

    it('converts cents to currency units, flooring the min and ceiling the max', async () => {
      const { service } = makeService({ min_cents: 12345, max_cents: 67890 });

      const bounds = await service.runPriceBounds();

      expect(bounds).toEqual({ min: 123, max: 679 });
    });

    it('handles bigint aggregates from the driver', async () => {
      const { service } = makeService({ min_cents: BigInt(10000), max_cents: BigInt(115000) });

      const bounds = await service.runPriceBounds();

      expect(bounds).toEqual({ min: 100, max: 1150 });
    });

    it('returns null bounds when no salon has price data', async () => {
      const { service } = makeService({ min_cents: null, max_cents: null });

      const bounds = await service.runPriceBounds();

      expect(bounds).toEqual({ min: null, max: null });
    });

    it('returns null bounds when the query yields no rows', async () => {
      const { service } = makeService(undefined);

      const bounds = await service.runPriceBounds();

      expect(bounds).toEqual({ min: null, max: null });
    });

    it('scopes the aggregate to non-deleted salons', async () => {
      const { service, prisma } = makeService({ min_cents: 10000, max_cents: 115000 });

      await service.runPriceBounds();

      const sql = (prisma.$queryRaw as jest.Mock).mock.calls[0][0];
      // Prisma.Sql keeps the raw text in `strings` — the WHERE clause must
      // exclude soft-deleted salons.
      expect(sql.strings.join('')).toContain('deleted_at IS NULL');
      expect(sql.strings.join('')).toContain('MIN(s.min_price_cents)');
      expect(sql.strings.join('')).toContain('MAX(s.max_price_cents)');
    });
  });
});
