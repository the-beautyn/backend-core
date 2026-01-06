# EasyWeek widget booking confirmation (MVP)

- **Endpoint**: `POST /api/v1/bookings/easyweek/confirm` (JWT + client role)
- **Request body**:
  - `salonId` (uuid, required)
  - `bookingUuid` (EasyWeek booking uuid, required)
  - `userId` (uuid, optional; defaults to authenticated user)
- **Response**: `bookingId`, `status`, `datetime`, `endDatetime`, `easyweek` summary (uuid, location, timezone, cancel/complete flags).

### Flow
1. Resolve EasyWeek credentials via `CrmIntegrationService` and fetch booking details from `GET /bookings/{uuid}`.
2. Map to booking status: `is_canceled` → `canceled`, `is_completed` → `completed`, otherwise `created`.
3. Upsert `Booking` by `(crmType=EASYWEEK, crmRecordId=bookingUuid)` with start/end datetime, CRM payload, and ordered service ids.
4. Upsert `EasyweekBookingDetails` (one-to-one with Booking) with normalized fields and raw payload for diagnostics.
5. Return the existing/new booking (idempotent).

### Data model changes
- `Booking`: added `crmType`, `crmPayload` (Json), `endDatetime`, unique `(crmType, crmRecordId)`.
- New `EasyweekBookingDetails` table storing start/end time, location uuid, status flags, ordered services, policy/links, and raw payload per booking.

### Error handling
- Missing EasyWeek link/credentials → 424/502 (CRM dependency).
- Booking not found in EasyWeek → 404.
- Missing start time in CRM response → 400.
