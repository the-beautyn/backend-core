-- The owner panel's Скасовані tab filters the salon's cancelled bookings by
-- cancelled_at and orders by it (BEA-67); pair it with the existing
-- (salon_id, datetime DESC) index that serves the other tabs.
CREATE INDEX "bookings_salon_cancelled_at_idx" ON "bookings" ("salon_id", "cancelled_at" DESC);
