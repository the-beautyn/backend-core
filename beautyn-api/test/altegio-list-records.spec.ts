import { listRecords } from '../libs/crm/provider-core/src/altegio/bookings';

// listRecords hits GET /records/{company_id} with the window + with_deleted, maps each record to
// AltegioBooking (same shape as the single-record endpoint), and pages until a short page.
describe('Altegio listRecords', () => {
  const makeCtx = (http: jest.Mock) => ({ http, requireExternalSalonId: () => 123 }) as any;

  it('requests the records list with window + with_deleted params', async () => {
    const http = jest.fn().mockResolvedValue([{ id: 1, datetime: '2026-06-10T11:00:00+03:00', deleted: false }]);
    const page = await listRecords(makeCtx(http), { startDate: '2026-06-01', endDate: '2026-07-01', withDeleted: true });

    expect(http).toHaveBeenCalledTimes(1);
    const [method, path, opts] = http.mock.calls[0];
    expect(method).toBe('GET');
    expect(path).toBe('/api/v1/records/123');
    expect(opts.query).toMatchObject({ page: 1, start_date: '2026-06-01', end_date: '2026-07-01', with_deleted: 1 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].crmRecordId).toBe('1');
    expect(page.items[0].isDeleted).toBe(false);
  });

  it('omits with_deleted when not requested', async () => {
    const http = jest.fn().mockResolvedValue([]);
    await listRecords(makeCtx(http), {});
    expect(http.mock.calls[0][2].query.with_deleted).toBeUndefined();
  });

  it('paginates until a short page comes back', async () => {
    const full = Array.from({ length: 2 }, (_, i) => ({ id: i + 1 }));
    const http = jest
      .fn()
      .mockResolvedValueOnce(full) // page 1 full → keep going
      .mockResolvedValueOnce([{ id: 3 }]); // page 2 short → stop
    const page = await listRecords(makeCtx(http), { count: 2 });

    expect(http).toHaveBeenCalledTimes(2);
    expect(http.mock.calls[0][2].query.page).toBe(1);
    expect(http.mock.calls[1][2].query.page).toBe(2);
    expect(page.items.map((b) => b.crmRecordId)).toEqual(['1', '2', '3']);
  });
});
