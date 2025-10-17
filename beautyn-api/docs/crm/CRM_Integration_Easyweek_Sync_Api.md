# CRM Integration — EasyWeek Sync API (Beautyn)

Authoritative reference for how Beautyn integrates with EasyWeek for initial import, delta sync, availability lookup, and booking lifecycle. This document is implementation‑ready and aligns with our integration stack: Adapter → Provider Core → Retry Handler → Token Storage → Capability Registry → Sync Scheduler.

> Links by module name only: Provider Core, CRM Adapter, Capability Registry, Retry Handler, Token Storage, Sync Scheduler.


## Goal

- Show exactly how Provider Core calls EasyWeek for:
  - Initial import (workspace, locations, categories, services, staff)
  - Delta sync (cron diffs via Sync Scheduler)
  - Availability (time slots)
  - Booking lifecycle (create, complete, cancel)
- Provide precise headers, params, and “Data we use” subsets to keep it concise.
- Include mapping to our internal modules and normalized DTOs.


## Architecture Anchors

- Provider Core: Only layer that issues HTTP to EasyWeek; owns auth headers and payload mapping. Normalizes vendor responses into Provider Core DTOs.
- CRM Adapter: Application‑facing façade that validates inputs and routes to Provider Core. Wraps calls with Retry Handler and circuit breaker.
- Capability Registry: Declares provider feature flags (e.g., supportsWebhooks, supportsReschedule=false, maxBatch=100, timeGranularityMin=10, authFlow=oauth) and enforces them in the Adapter.
- Retry Handler: Exponential backoff and 429 handling. Used by the Adapter when calling Provider Core.
- Token Storage: Stores OAuth/secret tokens (and related metadata). Provider Core fetches secrets from here during `init`.
- Sync Scheduler: Orchestrates initial import and recurring cron diffs. Adapter enqueues jobs; Provider Core performs the pulls.


## Auth & Headers

- Header Authorization: "secret" (opaque credential stored in Token Storage)
- Header Workspace: "slug" (workspace identifier stored alongside account metadata)
- Provider Core constructs all headers. CRM Adapter never crafts vendor headers.
- Token Source: Token Storage provides the `apiKey`/secret and Account Registry provides non‑secret `workspaceSlug` and default `locationId` per salon.

> Example base: `https://my.easyweek.io` with public v2 endpoints.


## Operations

Each section lists method, path, headers, query/body schema, “Data we use”, a compact sample request/response, and mapping to our DTOs and modules.

---

### 1) Workspace

- Method/Path: GET `/api/public/v2/workspace`
- Headers: `Authorization`, `Workspace`
- Query: none
- Data we use: `uuid`, `name`, `icon`, `logo`

Sample request

```http
GET /api/public/v2/workspace HTTP/1.1
Authorization: <secret>
Workspace: <slug>
```

Compact sample response

```json
{
  "data": {
    "uuid": "ws_123",
    "name": "Demo Studio",
    "icon": "https://.../icon.png",
    "logo": "https://.../logo.png"
  }
}
```

Mapping

| Vendor | Provider Core | Internal Module |
|---|---|---|
| uuid | context.workspaceId (kept in Account Registry) | Account Registry data |
| name | SalonData.name (if used as default) | Salon Module |
| icon/logo | SalonData.imageUrls[0]/mainImageUrl | Salon Module |

Error/edge cases

- 401/403 → ErrorKind.AUTH, not retryable.
- Missing `Workspace` header → 400 vendor; surface as ErrorKind.VALIDATION.

---

### 2) Locations (Salons)

- Method/Path: GET `/api/public/v2/locations`
- Headers: `Authorization`, `Workspace`
- Query: `page`, `limit` (vendor pagination; Provider Core follows links or params until exhausted)
- Data we use: `uuid`, `name`, `images[]`, `description`, `opening_hours.days{mon..sun}[{from,to}]`, `address{address_1,city,postal_code,position{lat,lng}}`, `timezone{name,short,offset}`

Sample request

```http
GET /api/public/v2/locations?page=1&limit=50 HTTP/1.1
Authorization: <secret>
Workspace: <slug>
```

Compact sample response

```json
{
  "data": [
    {
      "uuid": "loc_1",
      "name": "Center St.",
      "description": "Main branch",
      "images": ["https://.../1.jpg", "https://.../2.jpg"],
      "opening_hours": {
        "days": {
          "mon": [{"from": "09:00", "to": "18:00"}],
          "tue": [{"from": "09:00", "to": "18:00"}]
        }
      },
      "address": {
        "address_1": "12 Center St",
        "city": "Berlin",
        "postal_code": "10115",
        "position": { "lat": 52.52, "lng": 13.405 }
      },
      "timezone": { "name": "Europe/Berlin", "short": "CET", "offset": "+01:00" }
    }
  ],
  "links": { "next": null }
}
```

Mapping

| Vendor | Provider Core (SalonData) | Internal Module (SalonDto) |
|---|---|---|
| uuid | externalId | crm_id / crm_external_id equivalent |
| name | name | name |
| description | description | open_hours_json (note: description stored elsewhere) |
| images[] | imageUrls, mainImageUrl | cover_image_url, images_count |
| opening_hours.days | workingSchedule (normalized to Day/Hhmm) | open_hours_json |
| address.address_1 | location.addressLine | address_line |
| address.city | location.city | city |
| address.position.lat/lng | location.lat/lon | latitude/longitude |
| timezone.name | timezone | n/a (or inferred per salon) |

Error/edge cases

- Locations may be multiple; Account Registry stores the chosen `locationId` for the salon. Others ignored unless multi‑site support is enabled.

---

### 3) Service Categories

- Method/Path: GET `/api/public/v2/locations/{location_uuid}/service-categories`
- Headers: `Authorization`, `Workspace`
- Query: pagination (vendor standard)
- Data we use: `uuid`, `name`, `order`

Sample request

```http
GET /api/public/v2/locations/loc_1/service-categories HTTP/1.1
Authorization: <secret>
Workspace: <slug>
```

Compact sample response

```json
{ "data": [ { "uuid": "cat_1", "name": "Hair", "order": 1 } ] }
```

Mapping

| Vendor | Provider Core (CategoryData) | Internal Module |
|---|---|---|
| uuid | externalId | categories.crm_external_id |
| name | name | categories.name |
| order | n/a (optionally in extra) | categories.order (if present) |

Error/edge cases

- Missing or empty list is valid. Treat as zero categories.

---

### 4) Services

- Method/Path: GET `/api/public/v2/locations/{location_uuid}/services`
- Headers: `Authorization`, `Workspace`
- Query: pagination (vendor standard)
- Data we use: `uuid`, `name`, `description`, `currency`, `price`, `duration{value,iso_8601}`, `category{uuid,name,order}`

Sample request

```http
GET /api/public/v2/locations/loc_1/services HTTP/1.1
Authorization: <secret>
Workspace: <slug>
```

Compact sample response

```json
{
  "data": [
    {
      "uuid": "svc_1",
      "name": "Haircut",
      "description": "Classic",
      "currency": "EUR",
      "price": 3500,
      "duration": { "value": 30, "iso_8601": "PT30M" },
      "category": { "uuid": "cat_1", "name": "Hair", "order": 1 }
    }
  ]
}
```

Mapping

| Vendor | Provider Core (ServiceData) | Internal Module (ServiceDto) |
|---|---|---|
| uuid | externalId | crm_external_id |
| name | name | name |
| description | description | description |
| currency | currency | currency |
| price | priceMinor | price_cents |
| duration.value | durationMin | duration_minutes |
| category.uuid | categoryExternalId | category_id (after id lookup by crm_external_id) |

Error/edge cases

- Some services may not be attached to a category; map `categoryExternalId` to null.

---

### 5) Staff (Workers)

- Method/Path: GET `/api/public/v2/locations/{location_uuid}/staffers`
- Headers: `Authorization`, `Workspace`
- Query: pagination (vendor standard)
- Data we use: `uuid`, `first_name`, `last_name`, `position`, `description`, `avatar`

Sample request

```http
GET /api/public/v2/locations/loc_1/staffers HTTP/1.1
Authorization: <secret>
Workspace: <slug>
```

Compact sample response

```json
{
  "data": [
    {
      "uuid": "stf_1",
      "first_name": "Alice",
      "last_name": "Brown",
      "position": "Master",
      "description": "Top stylist",
      "avatar": "https://.../alice.jpg"
    }
  ]
}
```

Mapping

| Vendor | Provider Core (WorkerData) | Internal Module (WorkerDto) |
|---|---|---|
| uuid | externalId | crm_external_id (stored on worker if applicable) |
| first_name + last_name | name ("First Last") | first_name, last_name |
| position | position | role |
| description | description | n/a (could be stored in profile) |
| avatar | photoUrl | photo_url |

Error/edge cases

- Workers without `last_name` are acceptable; Provider Core should still form `name` and split to dto fields when syncing into our DB.

---

### 6) Accounts (for completion payments)

- Method/Path: GET `/api/public/v2/locations/{location_uuid}/accounts`
- Headers: `Authorization`, `Workspace`
- Query: none
- Data we use: `uuid`, `name`

Sample response (compact)

```json
{ "data": [ { "uuid": "acc_default", "name": "Main Register" } ] }
```

Mapping

- Used only at booking completion to attribute revenue. Stored in Account Registry metadata per salon.

---

### 7) Availability

- Method/Path: GET `/api/public/v2/locations/{location_uuid}/time-slots`
- Headers: `Authorization`, `Workspace`
- Query:
  - `service_uuid` (required)
  - `staffer_uuid` (optional)
  - `range_start` (ISO 8601)
  - `range_end` (ISO 8601)
  - `timezone` (IANA)
- Data we use: `dates[].slots[{start,end,price,quantity}]`, `timezone`, `currency`

Sample request

```http
GET /api/public/v2/locations/loc_1/time-slots?service_uuid=svc_1&staffer_uuid=stf_1&range_start=2025-08-01T00:00:00Z&range_end=2025-08-07T00:00:00Z&timezone=Europe/Berlin HTTP/1.1
Authorization: <secret>
Workspace: <slug>
```

Compact sample response

```json
{
  "data": {
    "timezone": "Europe/Berlin",
    "currency": "EUR",
    "dates": [
      {
        "date": "2025-08-01",
        "slots": [
          { "start": "2025-08-01T09:00:00+02:00", "end": "2025-08-01T09:30:00+02:00", "price": 3500, "quantity": 1 }
        ]
      }
    ]
  }
}
```

Mapping

| Vendor | Internal Module |
|---|---|
| dates[].slots[].start/end | Booking Module availability view model (ISO strings) |
| price, currency | surfaced to pricing UI when present |

Notes

- Provider Core method: planned `getAvailability(ctx, { locationId, serviceId, stafferId?, range, tz })`. Not yet on `ICrmProvider`; add when wiring UI to vendor slots.
- Time granularity: Capability Registry mandates 10‑minute minimum; UI should snap to 10 minutes.

Error/edge cases

- 400 if `service_uuid` missing; Adapter validates before calling Provider Core.

---

### 8) Booking — Create

- Method/Path: POST `/api/public/v2/bookings`
- Headers: `Authorization`, `Workspace`
- Payload we send

```json
{
  "staffer_uuid": "stf_1",
  "reserved_on": "2025-08-01T09:00:00+02:00",
  "location_uuid": "loc_1",
  "service_uuid": "svc_1",
  "customer_phone": "+12025550123",
  "customer_first_name": "Anna",
  "customer_last_name": "M.",
  "customer_email": "anna@example.com",
  "booking_comment": "Quiet room, please",
  "timezone": "Europe/Berlin"
}
```

Compact sample response

```json
{
  "data": {
    "uuid": "bk_1",
    "start_time": "2025-08-01T09:00:00+02:00",
    "end_time": "2025-08-01T09:30:00+02:00",
    "duration": { "value": 30, "iso_8601": "PT30M" },
    "is_canceled": false,
    "is_completed": false,
    "status": { "name": "confirmed" },
    "order": { "subtotal": 3500, "total": 3500 },
    "ordered_services": [ { "uuid": "svc_1" } ]
  }
}
```

Provider Core mapping (CreateBookingInput → vendor payload → response)

| Internal → Vendor | Source |
|---|---|
| staffer_uuid | `payload.externalWorkerId` |
| reserved_on | `payload.startAtIso` |
| location_uuid | `context.locationId` (from Account Registry) |
| service_uuid | `payload.externalServiceId` |
| customer_* | `payload.customer.{phone,name,email}` (split name into first/last when possible) |
| booking_comment | `payload.note` |
| timezone | derived from salon or client request |

| Vendor → Internal | Target |
|---|---|
| uuid | Booking Module.external_id |
| start_time/end_time | Booking time fields |
| duration.value/iso_8601 | Stored on booking meta |
| is_canceled/is_completed | Booking flags |
| status.name | Booking status text |
| order.subtotal/total | Price minor totals |
| ordered_services[] | Linked service external ids |

Idempotency

- Prefer client‑side idempotency key when available (header `Idempotency-Key` if vendor supports; otherwise Provider Core dedupes by tuple `(customer_phone, reserved_on, service_uuid)` inside a short window).

Error/edge cases

- Slot conflict → vendor 409; surface as ErrorKind.VALIDATION (not retryable).
- 429 → Retry Handler backs off then replays.

---

### 9) Booking — Complete

- Method/Path: PUT `/api/public/v2/bookings/{booking_uuid}/status/complete`
- Headers: `Authorization`, `Workspace`
- Payload we send

```json
{
  "account_uuid": "acc_default",
  "staffer_uuid": "stf_1",
  "internal_notes": "Walk-in paid",
  "paid_amount": 3500
}
```

Data we use from response: `is_completed`, `status{name}`, `order{amount_paid,total}`

Mapping

| Vendor → Internal | Target |
|---|---|
| is_completed | Booking flag |
| status.name | Booking status text |
| order.amount_paid/total | Payment fields |

Error/edge cases

- Unknown `account_uuid` → 400 vendor; Provider Core fetches accounts in advance and stores a default in Account Registry.

---

### 10) Booking — Cancel

- Method/Path: PUT `/api/public/v2/bookings/{booking_uuid}/status/cancel`
- Headers: `Authorization`, `Workspace`
- Payload we send

```json
{
  "cancel_reason": "customer_request",
  "internal_notes": "No-show",
  "staffer_uuid": "stf_1"
}
```

Data we use from response: `is_canceled`, `status?`, `ordered_services[]`

Mapping

| Vendor → Internal | Target |
|---|---|
| is_canceled | Booking flag |
| status.name? | Booking status text (if returned) |
| ordered_services[] | Service linkage on cancellation (informative) |

Error/edge cases

- Cancel reason is vendor enum; Provider Core maps our free‑text/enum to a vendor‑accepted value.


## Mapping to Internal Modules (normative)

- Salon Module: Locations → `SalonDto`
  - address: `address.address_1`, `city`, `postal_code`, `position{lat,lng}` → `address_line`, `city`, `latitude`, `longitude`
  - hours: `opening_hours.days{mon..sun}[{from,to}]` → `open_hours_json`
  - gallery: `images[]` → `cover_image_url` (first) and count → `images_count`
  - tz: `timezone.name`

- Services Module: Service Categories + Services
  - categories: `uuid`, `name` → categories table (`crm_external_id`, `name`)
  - services: `uuid`, `name`, `description`, `currency`, `price`, `duration.value`, `category.uuid` → `ServiceDto`
    - `duration_minutes = duration.value`
    - `price_cents = price`
    - `is_active = true`

- Workers Module: Staffers → `WorkerDto`
  - `fullName` = `first_name + ' ' + last_name`
  - `role` = `position`
  - `photoUrl` = `avatar`
  - profile fields: `email`, `phone` if present

- Booking Module: Bookings + Availability
  - availability: Vendor time‑slots → availability view model
  - create/approve/cancel flows: store vendor booking uuid in `external_id`


## Capabilities & Constraints (EasyWeek profile)

- supportsWebhooks: true (Capability Registry: `webhooks=true`)
- supportsReschedule: false (no reschedule push; rescheduling handled client‑side → cancel+recreate when required)
- maxBatch: 100 (Capability Registry: `batchSize=100`)
- timeGranularityMin: 10 minutes (UI should snap to 10‑minute increments)
- authFlow: oauth (opaque secret in Token Storage; Provider Core treats `Authorization` as opaque)

Consequences

- No vendor reschedule: CRM Adapter disables `rescheduleBooking` for EASYWEEK.
- Webhooks: If vendor pushes changes, we still run cron diffs as safety net.


## Error Handling & Retries

- 429 (rate limit): Retry Handler does exponential backoff with jitter; honors vendor `Retry-After` if supplied (delay override). Retries are logged with correlation id only.
- 5xx or network failures: Retry Handler retries up to configured attempts, then bubbles a `CrmError` with ErrorKind.NETWORK/INTERNAL.
- Auth errors (401/403): Non‑retryable; surfaced as ErrorKind.AUTH.
- Input validation (4xx): Non‑retryable; surfaced as ErrorKind.VALIDATION.

Idempotency

- For booking create, prefer an idempotency key if vendor supports it.
- If not, Provider Core dedupes by `(customer_phone, reserved_on, service_uuid)` within a short time window to avoid duplicates on retry.


## Security & PII

- Never log secrets or full payloads.
- Log only: correlationId, operation, provider, status, attempt, and high‑level outcome.
- Token Storage encrypts all bundles at rest; Provider Core requests only what is needed per call.


## TL;DR (Cheat‑Sheet)

| Operation | Provider Core method | Internal module |
|---|---|---|
| Workspace | init(ctx) + fetch workspace (internal) | Account Registry metadata |
| Locations | pullSalon(ctx) | Salon Module |
| Service Categories | pullCategories(ctx) | Services Module (categories) |
| Services | pullServices(ctx) | Services Module (services) |
| Staff | pullWorkers(ctx) | Workers Module |
| Availability | getAvailability(ctx, ...)(planned) | Booking/Workers availability |
| Booking Create | createBooking(ctx, payload) | Booking Module |
| Booking Complete | completeBooking(ctx, payload)(vendor PUT) | Booking Module |
| Booking Cancel | cancelBooking(ctx, payload) | Booking Module |

Adapter wiring

- CRM Adapter → Provider Core methods above; wrapped with Retry Handler and circuit breaker.
- Sync Scheduler → triggers full import and cron diffs; Provider Core executes pulls in batches of up to 100.


## Acceptance Checklist

- Each endpoint section includes: path, method, headers, query/body schema, “data we use”, sample req/res, mapping table, and error/edge‑cases.
- TL;DR table lists operation → Provider Core method → internal module.
- Capabilities documented with consequences (no reschedule push; cancel+recreate strategy).
- Auth and Token Storage responsibilities are explicit (Authorization + Workspace headers; secrets in Token Storage).
- Error handling and idempotency behavior are specified.

