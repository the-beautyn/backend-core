# CRM Integration — Altegio Sync API (Beautyn)

Authoritative reference for how Beautyn integrates with Altegio for salon profile, categories, services, staff, schedules (read-only), and booking lifecycle. This document is implementation‑ready and aligns with our integration stack: Adapter → Provider Core → Retry Handler → Token Storage → Capability Registry → Sync Scheduler.

> Links by module name only: Provider Core, CRM Adapter, Capability Registry, Retry Handler, Token Storage, Sync Scheduler.


## Goal

- Define exactly how Provider Core calls Altegio for:
  - Company discovery and profile upsert (Salon Module)
  - Categories and services import (Services Module)
  - Staff and schedule import (Workers Module)
  - Booking lifecycle (create, reschedule/update, delete, list)
- Provide precise headers, params, and “Data we use” subsets.
- Map to our internal modules and normalized DTOs.


## Architecture Anchors

- Provider Core: Issues HTTP to Altegio and maps request/response payloads. Normalizes vendor responses into Provider Core DTOs.
- CRM Adapter: Façade for app code. Validates, applies Capability Registry rules, and wraps calls with Retry Handler.
- Capability Registry: Altegio profile → `supportsWebhooks=true`, `supportsReschedule=true`, `maxBatch=200`, `timeGranularityMin=5`, `authFlow=dual`.
- Retry Handler: Exponential backoff; honors 429 Retry‑After.
- Token Storage: Stores dual‑token bundle (Bearer access token + secondary `User` token) and refresh metadata.
- Sync Scheduler: Orchestrates initial import and recurring diffs; invokes Provider Core pull methods.


## Auth & Headers

- Required headers for every Altegio call:
  - `Accept: application/vnd.api.v2+json`
  - `Authorization: Bearer <token>`
  - `User: <token>`
- Token Storage: Stores a dual‑token bundle `{ accessToken, userToken, provider='ALTEGIO', accountId, expiresAt? }`.
- Provider Core fetches tokens from Token Storage per call; Adapter never crafts vendor headers directly.
- Refresh behavior: If access token is near expiry or rejected with 401/403, Adapter/Provider Core consult Token Storage for refresh. Until a refresh flow is implemented, surface AUTH error to caller; do not auto‑retry with the same invalid token.


## Operations

Each section lists method, path, headers, query/body schema, “Data we use”, compact sample request/response, mapping to our DTOs and modules, and error/edge‑cases. Inactive/Non‑MVP endpoints are explicitly marked.

---

### 1) Companies / Salon Profile — List Companies

- Method/Path: GET `/api/v1/companies`
- Headers: `Accept`, `Authorization`, `User`
- Query: none
- Data we use (per company): `id`, `public_title` (name), `company_photos[]/logo`, `description` (html→text), `address`, `timezone_name`, `schedule`, `country`, `city`, `coordinate_lat`, `coordinate_lon`, `active`

Sample request

```http
GET /api/v1/companies HTTP/1.1
Accept: application/vnd.api.v2+json
Authorization: Bearer <accessToken>
User: <userToken>
```

Compact sample response

```json
{
  "data": [
    {
      "id": 101,
      "public_title": "Studio Central",
      "company_photos": { "logo": "https://.../logo.png", "gallery": ["https://.../1.jpg"] },
      "description": "<p>Downtown salon</p>",
      "address": "12 Main St",
      "country": "DE",
      "city": "Berlin",
      "timezone_name": "Europe/Berlin",
      "schedule": { /* vendor format */ },
      "coordinate_lat": 52.5200,
      "coordinate_lon": 13.4050,
      "active": true
    }
  ]
}
```

Mapping

| Vendor | Provider Core (SalonData) | Internal Module (SalonDto) |
|---|---|---|
| id | externalId | crm_external_id |
| public_title | name | name |
| company_photos.logo | mainImageUrl | cover_image_url |
| company_photos.gallery[] | imageUrls | images_count (len) |
| description (html→text) | description | description |
| address | location.addressLine | address_line |
| city | location.city | city |
| country | location.country | country |
| coordinate_lat/lon | location.lat/lon | latitude/longitude |
| timezone_name | timezone | n/a or salon.tz |
| active | isActive | is_active |

Error/edge cases

- Multiple companies may exist; Account Registry holds the chosen company id per Beautyn salon.

---

### 2) Companies / Salon Profile — Get Company (canonical)

- Method/Path: GET `/api/v1/company/{id}`
- Headers: `Accept`, `Authorization`, `User`
- Data we use: same as in list; this is the canonical source for a single salon upsert.

Sample request

```http
GET /api/v1/company/101 HTTP/1.1
Accept: application/vnd.api.v2+json
Authorization: Bearer <accessToken>
User: <userToken>
```

Compact sample response

```json
{
  "data": {
    "id": 101,
    "public_title": "Studio Central",
    "company_photos": { "logo": "https://.../logo.png" },
    "description": "<p>Downtown salon</p>",
    "address": "12 Main St",
    "city": "Berlin",
    "country": "DE",
    "timezone_name": "Europe/Berlin",
    "schedule": {},
    "coordinate_lat": 52.52,
    "coordinate_lon": 13.405,
    "active": true
  }
}
```

Error/edge cases

- If company is inactive, we still import but mark `is_active=false` and prevent booking in UI.

---

### 3) Companies / Salon Profile — Update Company (limited)

- Method/Path: PUT `/api/v1/company/{id}`
- Headers: `Accept`, `Authorization`, `User`
- Payload subset we send: `title`, `address`, `coordinate_lat`, `coordinate_lon`, `description`, `short_descr`
- Notes: Do not attempt to update logo/photos/schedule via API in our scope (unsupported/managed via CRM UI).

Sample payload (subset)

```json
{
  "title": "Studio Central",
  "address": "12 Main St",
  "coordinate_lat": 52.52,
  "coordinate_lon": 13.405,
  "description": "Downtown salon",
  "short_descr": "City center"
}
```

MVP

- Optional; only used when write‑back is enabled for basic fields.

---

### 4) Service Categories — Get

- Method/Path: GET `/api/v1/company/{company_id}/service_categories`
- Headers: `Accept`, `Authorization`, `User`
- Query: none (vendor paginates if needed)
- Data we use: `id`, `title` (name), `weight`

Sample request

```http
GET /api/v1/company/101/service_categories HTTP/1.1
Accept: application/vnd.api.v2+json
Authorization: Bearer <accessToken>
User: <userToken>
```

Compact sample response

```json
{ "data": [ { "id": 301, "title": "Hair", "weight": 10 } ] }
```

Mapping

| Vendor | Provider Core (CategoryData) | Internal Module |
|---|---|---|
| id | externalId | categories.crm_external_id |
| title | name | categories.name |
| weight | sortWeight | categories.order (if present) |

---

### 5) Service Categories — Update (admin)

- Method/Path: PUT `/api/v1/service_category/{company_id}/{id}`
- Headers: `Accept`, `Authorization`, `User`
- Payload subset: `title`, `weight`, `staff[]`
- Notes: Privileged operation; not required for read‑only import flow.

MVP

- Not required.

---

### 6) Service Categories — Create (admin)

- Method/Path: POST `/api/v1/service_category/{company_id}`
- Headers: `Accept`, `Authorization`, `User`
- Payload subset: `title`, `weight`, `staff[]`

MVP

- Not required unless we add write‑back.

---

### 7) Services — Get

- Method/Path: GET `/api/v1/company/{company_id}/services`
- Headers: `Accept`, `Authorization`, `User`
- Query: none (vendor may return arrays with extra fields)
- Data we use (per service): `id`, `title→name`, `category_id`, `seance_length→duration_min`, `price_min`, `price_max`, `image`

Sample request

```http
GET /api/v1/company/101/services HTTP/1.1
Accept: application/vnd.api.v2+json
Authorization: Bearer <accessToken>
User: <userToken>
```

Compact sample response

```json
{
  "data": [
    {
      "id": 501,
      "title": "Haircut",
      "category_id": 301,
      "seance_length": 30,
      "price_min": 2500,
      "price_max": 4000,
      "image": "https://.../svc.jpg"
    }
  ]
}
```

Mapping

| Vendor | Provider Core (ServiceData) | Internal Module (ServiceDto) |
|---|---|---|
| id | externalId | crm_external_id |
| title | name | name |
| category_id | categoryExternalId | category_id (lookup by crm_external_id) |
| seance_length | durationMin | duration_minutes |
| price_min | price.minMinor | price_min_cents |
| price_max | price.maxMinor | price_max_cents |
| image | imageUrl | image_url |

Notes

- Grid settings present in vendor data are ignored except for diagnostics.

---

### 8) Services — Create / Update / Delete

- Create: POST `/api/v1/services/{company_id}/{service_id}`
- Update: PUT `/api/v1/services/{company_id}/{service_id}` (legacy; use sparingly)
- Delete: DELETE `/api/v1/services/{company_id}/{service_id}`
- PATCH `services` endpoint — ⛔ Not in MVP / Inactive (do not use)

MVP

- Read‑only import; do not call write endpoints unless explicitly enabled.

---

### 9) Staff — Get

- Method/Path: GET `/api/v1/company/{company_id}/staff`
- Headers: `Accept`, `Authorization`, `User`
- Data we use: `id`, `name`, `specialization`, `avatar` (and/or `avatar_big`), `email?`, `phone?`, `services_links[]`, `grid_settings`, `is_bookable`

Sample request

```http
GET /api/v1/company/101/staff HTTP/1.1
Accept: application/vnd.api.v2+json
Authorization: Bearer <accessToken>
User: <userToken>
```

Compact sample response

```json
{
  "data": [
    {
      "id": 701,
      "name": "Alice Brown",
      "specialization": "Master",
      "avatar": "https://.../alice.jpg",
      "email": "alice@example.com",
      "phone": "+4912345678",
      "is_bookable": true,
      "services_links": [ { "service_id": 501 } ]
    }
  ]
}
```

Mapping

| Vendor | Provider Core (WorkerData) | Internal Module (WorkerDto) |
|---|---|---|
| id | externalId | crm_external_id |
| name | name | first_name/last_name (split heuristics) |
| specialization | position | role |
| avatar(_big) | photoUrl | photo_url |
| email/phone | contacts | email/phone |
| services_links[].service_id | serviceExternalIds | linkage used for availability |
| is_bookable | isBookable | is_bookable |

---

### 10) Staff — Update

- Method/Path: PUT `/api/v1/staff/{company_id}/{staff_id}`
- Headers: `Accept`, `Authorization`, `User`
- Payload subset: `name`, `specialization`, `hidden`, `fired`, `(position where supported)`

MVP

- Optional; only if write‑back is enabled.

⛔ Quick create staff — Not in MVP / Inactive.

---

### 11) Staff Schedule — Get (read‑only)

- Method/Path: GET `/api/v1/schedule/{company_id}/{staff_id}/{start_date}/{end_date}`
- Headers: `Accept`, `Authorization`, `User`
- Path params: `start_date`, `end_date` as `YYYY-MM-DD`
- Data we use: `date`, `is_working`, `slots[{from,to}]`

Sample request

```http
GET /api/v1/schedule/101/701/2025-08-01/2025-08-07 HTTP/1.1
Accept: application/vnd.api.v2+json
Authorization: Bearer <accessToken>
User: <userToken>
```

Compact sample response

```json
{
  "data": [
    { "date": "2025-08-01", "is_working": true, "slots": [ { "from": "09:00", "to": "18:00" } ] }
  ]
}
```

Mapping

| Vendor | Internal |
|---|---|
| date | schedule.date |
| is_working | schedule.dayOpen |
| slots[].from/to | schedule.workingIntervals[] |

⛔ Update schedule (PUT) — Not in MVP / Inactive (405 from vendor). Use CRM UI.

---

### 12) Records (Bookings) — Create

- Method/Path: POST `/api/v1/records/{company_id}`
- Headers: `Accept`, `Authorization`, `User`
- Payload subset we send: `staff_id`, `services[{id, first_cost, discount, cost}]`, `client{phone,name,email}`, `datetime`, `seance_length`, `comment`
- Data we use from response: `id` (record id), `datetime`, `seance_length`, `staff{id,name}`, `services[]`, `client{id,phone,email,name}`, `short_link`

Sample payload (compact)

```json
{
  "staff_id": 701,
  "services": [ { "id": 501, "first_cost": 3000, "discount": 0, "cost": 3000 } ],
  "client": { "phone": "+4912345678", "name": "Alice B", "email": "alice@example.com" },
  "datetime": "2025-08-01T09:00:00+02:00",
  "seance_length": 30,
  "comment": "New customer"
}
```

Compact sample response

```json
{
  "data": {
    "id": 9001,
    "datetime": "2025-08-01T09:00:00+02:00",
    "seance_length": 30,
    "short_link": "https://.../r/abcd",
    "staff": { "id": 701, "name": "Alice Brown" },
    "client": { "id": 8801, "phone": "+4912345678", "email": "alice@example.com", "name": "Alice B" },
    "services": [ { "id": 501, "title": "Haircut", "cost": 3000 } ]
  }
}
```

Mapping

| Vendor → Internal | Target |
|---|---|
| id | Booking.external_id |
| datetime | Booking.datetime |
| seance_length | Booking.duration_minutes |
| staff.id/name | Booking.worker_link |
| services[] | Booking.service_links |
| client.* | Booking.customer fields |
| short_link | Booking.external_short_link |

Idempotency

- Prefer vendor `api_id` if supported; otherwise Provider Core dedupes on `(client.phone, datetime, staff_id, services[])` within a short window to avoid duplicates on retry.

---

### 13) Records (Bookings) — Update (reschedule/comment)

- Method/Path: PUT `/api/v1/record/{company_id}/{record_id}`
- Headers: `Accept`, `Authorization`, `User`
- Minimal payload for reschedule/note: `datetime`, `comment`
- Altegio supports reschedule; Adapter enforces overlap rules surfaced by provider.

Sample payload

```json
{ "datetime": "2025-08-01T10:00:00+02:00", "comment": "Moved by customer" }
```

Expected responses

- 200 with updated booking body (fields as in Create response) or 204 with no body; Provider Core then fetches the record if needed.

---

### 14) Records (Bookings) — Delete

- Method/Path: DELETE `/api/v1/record/{company_id}/{record_id}`
- Headers: `Accept`, `Authorization`, `User`
- Behavior: Marks booking as deleted/canceled per vendor semantics.

---

### 15) Records (Bookings) — List (by client, with_deleted)

- Method/Path: GET `/api/v1/records/{company_id}?page={page_number}&count={bookings_per_page},client_id={id}&with_deleted={0|1}&start_date={"yyyy.MM.dd"}&end_date={"yyyy.MM.dd"}`
- Headers: `Accept`, `Authorization`, `User`
- Use: Reconciliation and history import.

Mapping

| Vendor | Internal |
|---|---|
| id | Booking.external_id |
| datetime | Booking.datetime |
| is_deleted | Booking.is_deleted |
| services[] | Booking.service_links |
| staff | Booking.worker_link |


## Mapping to Internal Modules (normative)

- Salon Module: Company → `SalonResponseDto`
  - fields: `public_title`, `address`, `city`, `country`, `coordinate_lat/lon`, `timezone_name`, `company_photos.logo/gallery`, `active`

- Services Module: Service Categories + Services
  - categories: `id`, `title`, `weight` → categories table (`crm_external_id`, `name`, `order`)
  - services: `id`, `title`, `category_id`, `seance_length`, `price_min`, `price_max`, `image` → `ServiceDto`
    - `duration_minutes = seance_length`
    - `price_min_cents = price_min`, `price_max_cents = price_max`
    - `category_id` resolved by lookup using `categories.crm_external_id`

- Workers Module: Staff → worker entity
  - `name`, `specialization`, `avatar`, `is_bookable`, `services_links`

- Booking Module: Records → booking entity
  - store vendor record `id` as `external_id`
  - link to worker and service(s) using `staff.id` and `services[].id`


## Capabilities & Constraints (Altegio profile)

- supportsWebhooks: true
- supportsReschedule: true
- maxBatch: 200
- timeGranularityMin: 5 minutes
- authFlow: dual (Bearer + User headers)

⛔ Not in MVP / Inactive

- Schedule update (PUT) — Use CRM UI.
- Staff quick create — Use CRM UI or delayed write‑back.
- Services PATCH — Inactive/Not working; avoid.


## Error Handling & Retries

- Retryable: `5xx`, network errors, `429` (respect `Retry-After` if present). Use Retry Handler with exponential backoff + jitter.
- Non‑retryable: `401/403` (AUTH), `4xx` validation errors.
- Provider Core logs correlationId + provider only; no PII or tokens.

Idempotency

- Deduplicate booking create by vendor `api_id` if supported; otherwise by `(client, datetime, staff, services)`.


## Security & PII

- No plaintext tokens in logs; redact `Authorization`/`User` completely.
- Redact phone/email in logs (mask middle digits/characters).
- Token Storage keeps dual tokens encrypted; Provider Core only requests needed scopes.


## Flow Map

- Onboarding → `scheduleInitialSync` → Provider Core: `syncSalon` → `syncCategories` → `syncServices` → `syncStaff` → `syncSchedules` → ready for `createBooking`/`updateBooking`/`deleteBooking`.
- Sync Scheduler: cron diffs call the same pull methods with `maxBatch=200`.


## Acceptance Checklist

- Each endpoint section contains: method, path, auth headers, query/body schema, “data we use”, sample req/res, mapping table, error/edge‑cases, and MVP flags.
- Capability profile matches: `supportsWebhooks=true`, `supportsReschedule=true`, `maxBatch=200`, `timeGranularityMin=5`, `authFlow=dual`.
- Auth and Token Storage responsibilities are explicit (Accept, Authorization: Bearer, User headers; dual‑token bundle; refresh behavior documented).
- Inactive endpoints documented: schedule PUT, staff quick create, services PATCH.
- Flow map includes Onboarding → scheduleInitialSync → Provider Core syncs.

