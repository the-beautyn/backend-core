import { BookingHandlerService } from '../src/booking/booking-handler.service';

// Altegio returns service costs in major currency units (e.g. ₴700). The
// canonical internal unit is cents (the services sync multiplies Altegio prices
// by 100), and `total_price` / `total_price_cents` are documented as cents. So
// when a booking is reconciled from Altegio, mapAltegioServices must convert the
// monetary fields to cents — otherwise a synced booking's price is 100x too
// small once it overwrites the app-created seed.
describe('BookingHandlerService.mapAltegioServices — Altegio cost → cents', () => {
  const service = new BookingHandlerService({} as any);
  const mapAltegioServices = (services: unknown) =>
    (service as any).mapAltegioServices(services) as Array<Record<string, unknown>>;

  it('converts major-unit monetary fields to cents', () => {
    const result = mapAltegioServices([
      {
        id: 10,
        title: 'Camouflage',
        cost: 700,
        cost_to_pay: 700,
        manual_cost: 650,
        cost_per_unit: 700,
        first_cost: 100,
        discount: 5,
        amount: 1,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      cost: 70000,
      costToPay: 70000,
      manualCost: 65000,
      costPerUnit: 70000,
      firstCost: 10000,
      discount: 5, // percentage — unchanged
      amount: 1, // quantity — unchanged
    });
  });

  it('rounds fractional major units to whole cents', () => {
    const result = mapAltegioServices([{ id: 1, cost: 12.34, cost_to_pay: 12.34 }]);
    expect(result[0].cost).toBe(1234);
    expect(result[0].costToPay).toBe(1234);
  });

  it('keeps missing costs null (does not coerce to 0)', () => {
    const result = mapAltegioServices([{ id: 1, title: 'No price' }]);
    expect(result[0].cost).toBeNull();
    expect(result[0].costToPay).toBeNull();
  });

  // Regression for the pre-sync "price 100x" bug. The app-create path (altegio-booking.service)
  // seeds the booking from the selected services, whose Service.price is stored in CENTS. It
  // emits Altegio's major units (price / 100) precisely so this normalization lands back on the
  // original cents. Feeding cents straight in would double-convert (25000 → 2,500,000) and the
  // card would read ₴25000 instead of ₴250 until a CRM sync overwrote it.
  it('round-trips an app-created seed back to the original cents (no ×100 double-convert)', () => {
    const servicePriceCents = 25000; // ₴250, as stored on Service.price
    const seededMajorUnits = servicePriceCents / 100; // 250 — what altegio-booking.service emits
    const result = mapAltegioServices([
      { id: 10, title: 'Beard trimming', cost: seededMajorUnits, cost_to_pay: seededMajorUnits },
    ]);
    expect(result[0].cost).toBe(servicePriceCents);
    expect(result[0].costToPay).toBe(servicePriceCents);
  });
});
