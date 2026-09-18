import { normalizePagination } from '../../src/shared/utils/pagination.util';

// Inputs arrive from query strings, so anything that is not a usable positive integer
// has to fall back rather than reach Prisma as NaN — which would silently drop
// skip/take and quietly return the wrong page.
describe('normalizePagination', () => {
  it('defaults to the first page and the caller default limit', () => {
    expect(
      normalizePagination(undefined, undefined, {
        defaultLimit: 20,
        maxLimit: 100,
      }),
    ).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    });
  });

  it('computes skip from page and limit', () => {
    expect(normalizePagination(3, 10)).toEqual({
      page: 3,
      limit: 10,
      skip: 20,
    });
  });

  it('accepts numeric strings, as query params arrive', () => {
    expect(normalizePagination('4', '25')).toEqual({
      page: 4,
      limit: 25,
      skip: 75,
    });
  });

  it('caps limit at the caller maximum', () => {
    expect(normalizePagination(1, 5000, { maxLimit: 100 }).limit).toBe(100);
  });

  it('lets callers disagree about defaults, because the existing endpoints do', () => {
    expect(
      normalizePagination(undefined, undefined, {
        defaultLimit: 50,
        maxLimit: 200,
      }).limit,
    ).toBe(50);
    expect(
      normalizePagination(undefined, undefined, {
        defaultLimit: 20,
        maxLimit: 100,
      }).limit,
    ).toBe(20);
  });

  it.each([
    ['zero', 0],
    ['negative', -5],
    ['not a number', 'abc'],
    ['empty string', ''],
    ['null', null],
  ])('falls back when page is %s', (_label, page) => {
    expect(normalizePagination(page as never, 10).page).toBe(1);
  });

  it.each([
    ['zero', 0],
    ['negative', -5],
    ['not a number', 'abc'],
  ])('falls back when limit is %s', (_label, limit) => {
    expect(
      normalizePagination(1, limit as never, { defaultLimit: 20 }).limit,
    ).toBe(20);
  });

  it('floors fractional input instead of passing it to Prisma', () => {
    expect(normalizePagination(2.9, 10.7)).toEqual({
      page: 2,
      limit: 10,
      skip: 10,
    });
  });

  it('never produces a negative skip', () => {
    expect(normalizePagination(-1, 10).skip).toBe(0);
  });
});
