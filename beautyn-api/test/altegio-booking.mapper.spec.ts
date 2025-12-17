import { mapBookableServices, mapBookableWorkers, mapTimeSlots } from '../src/booking/altegio-booking/mappers/altegio-booking.mapper';

describe('Altegio booking mapper', () => {
  it('marks services available only when present in allowed list', () => {
    const result = mapBookableServices(
      [
        { id: 's1', name: 'Cut', price: 1000, duration: 30, categoryId: 'c1', crmServiceId: '10', category: { id: 'c1', name: 'Hair' } },
        { id: 's2', name: 'Color', price: 2000, duration: 60, categoryId: 'c2', crmServiceId: '11', category: { id: 'c2', name: 'Coloring' } },
        { id: 's3', name: 'Nails', price: 1500, duration: 45, categoryId: null, crmServiceId: null, category: null },
      ],
      new Set(['10']),
    );

    expect(result.services).toEqual([
      expect.objectContaining({ id: 's1', isAvailable: true }),
      expect.objectContaining({ id: 's2', isAvailable: false }),
      expect.objectContaining({ id: 's3', isAvailable: false }),
    ]);
    expect(result.categories).toHaveLength(2);
  });

  it('maps workers with bookable flag', () => {
    const result = mapBookableWorkers(
      [
        { id: 'w1', firstName: 'A', lastName: 'One', position: 'Stylist', photoUrl: null, crmWorkerId: '21' },
        { id: 'w2', firstName: 'B', lastName: 'Two', position: null, photoUrl: null, crmWorkerId: null },
      ],
      new Set(['21']),
    );
    expect(result.workers.find((w) => w.id === 'w1')?.bookable).toBe(true);
    expect(result.workers.find((w) => w.id === 'w2')?.bookable).toBe(false);
  });

  it('maps time slots to DTO shape', () => {
    const res = mapTimeSlots([{ time: '10:00', datetime: '2025-01-01T10:00:00+03:00', seance_length: 3600, sum_length: 3900 }]);
    expect(res.slots[0]).toEqual({
      time: '10:00',
      datetime: '2025-01-01T10:00:00+03:00',
      seanceLengthSec: 3600,
      sumLengthSec: 3900,
    });
  });
});
