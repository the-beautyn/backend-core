🔎 Search Module

## 1. Purpose

The Search Module provides a unified way to find salons based on:

- **Text query** (name, location keywords, etc.).
- **Location** (map viewport, chosen location, or Geo-IP).
- **AppCategories** (canonical service categories).
- **Basic filters** (price, time).
- **Sorting** (distance, rating, price, popularity).

MVP keeps search **runtime-based** (no dedicated index):

- It aggregates data live from Salon, Review, Services, and AppCategory modules.
- It stores **only** a small per-user history of **visited salons** for suggestions and “recent” display.

---

## 2. Responsibilities

### Included in MVP

- Base salon search (query + filters).
- Geo search by:
    - **map viewport** (visible map),
    - **chosen location** (centerLat/centerLng),
    - **Geo-IP fallback** when client gives no location.
- Time-based **“open at this time”** filtering (using open hours only).
- Price range filtering.
- **AppCategory filtering** using canonical AppCategories.
- Sorting:
    - by distance,
    - by rating (desc),
    - by price (asc/desc),
    - by popularity.
- Search history (visited salons) + clear history.
- Suggestions for salons (history + name match).

### Deferred (Future)

- True availability search (Booking/CRM-based).
- Advanced ranking and learning-to-rank.
- Full-text search engine / search index.
- Suggestions for services and cities.

---

## 3. Public API Contract

All endpoints exposed via API Gateway under `/search`.

### 3.1 Types & DTOs

### 3.1.1 LocationType

```tsx
export type LocationType =
  | 'city'
  | 'neighborhood'
  | 'address'
  | 'poi'
  | 'unknown';

```

Frontends can set this based on geocoder result type; backend uses it to pick a base radius.

---

### 3.1.2 SearchRequestDto

```tsx
export class SearchRequestDto {
  // Free text query
  query?: string; // salon name, location keywords, etc.

  // Circle-based search around a point (chosen location / user location)
  centerLat?: number;         // latitude of search center
  centerLng?: number;         // longitude of search center
  locationType?: LocationType;// optional hint from frontend/geocoder

  // Map viewport search (for “salons on visible map”)
  viewport?: {
    neLat: number;
    neLng: number;
    swLat: number;
    swLng: number;
  };

  // Time filter (MVP: open-hours only)
  date?: string;              // 'YYYY-MM-DD' (local date in search context)
  time?: string;              // 'HH:mm' (local time in search context)

  // Price filter (based on aggregated salon prices)
  priceMin?: number;          // main currency units (e.g. UAH)
  priceMax?: number;

  // Canonical AppCategories (from AppCategory module)
  appCategoryIds?: string[];  // filter salons that match at least one of these

  // Sorting
  sortBy?: 'distance' | 'rating_desc' | 'price_asc' | 'price_desc' | 'popular';

  // Pagination
  page?: number;              // 1-based
  limit?: number;             // default e.g. 20
}

```

Notes:

- There is **no `radiusKm` field**: radius is internal, computed on the backend.
- Geo source priority is:
    1. `viewport`,
    2. explicit `centerLat/centerLng`,
    3. Geo-IP fallback,
    4. none (global search).

---

### 3.1.3 SearchResponseDto

```tsx
export class SearchResponseDto {
  salonId: string;
  name: string;
  address: string;           // e.g. "Kyiv, Street Name 12"
  rating?: number;           // cached rating
  distanceKm?: number;       // distance from effective center if used
  logoUrl?: string;          // salon avatar
}

```

MVP does **not** include:

- services,
- price level,
- availability.

Those can be added later.

---

### 3.1.4 SearchSuggestionDto

```tsx
export type SuggestionType = 'salon' | 'history';

export class SearchSuggestionDto {
  id: string;                // salonId (for 'salon' and 'history')
  type: SuggestionType;      // 'history' = visited salon, 'salon' = generic match
  label: string;             // salon name
  subtitle?: string;         // e.g. "Kyiv · 4.8 ★"
  logoUrl?: string;          // for suggestion row avatar
}

```

For now, suggestions are always salons. In the future we can add `'service' | 'city'` types.

---

### 3.1.5 SearchHistoryItemDto

```tsx
export class SearchHistoryItemDto {
  id: string;                // history row ID
  salonId: string;
  salonName: string;
  city: string;
  logoUrl?: string;
  lastSearchedAt: string;    // ISO timestamp (uses updated_at)
}

```

---

### 3.2 Endpoints

### 3.2.1 `GET /search` – Main Search

**Description**

Return a paginated list of salons matching query + filters, sorted by `sortBy`. Uses geo logic (viewport / center / Geo-IP) when possible.

**Auth**

- Public (no auth required) for basic search.
- Optionally uses auth context for personalised stuff later, but not required in MVP.

**Query params**

Same as `SearchRequestDto` fields.

**Response**

```json
{
  "items": [
    {
      "salonId": "uuid",
      "name": "Hair Paradise",
      "address": "Kyiv, Street Name 12",
      "rating": 4.8,
      "distanceKm": 1.2,
      "logoUrl": "https://cdn/.../logo.png"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 124,
  "meta": {
    "effectiveRadiusKm": 5,    // optional, when circle search used
    "geoSource": "explicit"    // 'viewport' | 'center' | 'geoip' | 'none' (optional)
  }
}

```

`meta` is optional but useful for debugging / analytics.

---

### 3.2.2 `GET /search/suggestions` – Typeahead Suggestions

**Description**

Return salon suggestions based on:

- user’s visited salons (history), and
- salons whose names/location match the query.

**Auth**

- Requires authenticated user (for history).
- If unauthenticated, can still return generic salon suggestions (only `type: 'salon'`).

**Query params**

- `query?: string` – optional. Empty query → just recent history.

**Response** – array of `SearchSuggestionDto`.

---

### 3.2.3 `GET /search/history` – List Visited Salons

**Description**

Return latest N visited salons for current user (search history).

**Auth**

- Requires authenticated user.

**Query params**

- `limit?: number` – default 10–20.

**Response** – array of `SearchHistoryItemDto`.

---

### 3.2.4 `DELETE /search/history` – Clear All History

**Description**

- Delete all history entries for current user.

**Auth**

- Requires authenticated user.

**Response**

- `204 No Content`.

---

### 3.2.5 `DELETE /search/history/:id` – Remove Single Entry

**Description**

- Delete one history row by ID, scoped to current user.

**Auth**

- Requires authenticated user.

**Response**

- `204 No Content` on success.
- `404` if record doesn’t exist or doesn’t belong to user.

---

## 4. Internal Architecture

### 4.1 Folder Structure

```
src/
  search/
    search.module.ts
    search.controller.ts
    search.service.ts

    search-query-builder.service.ts     // geo filters, appCategory filters, sort
    search-history.service.ts           // visited salons tracking
    search-suggestions.service.ts       // combines history + name matches
    geo-location.service.ts             // viewport vs center vs Geo-IP, radius logic

    dto/
      search-request.dto.ts
      search-response.dto.ts
      search-suggestion.dto.ts
      search-history-item.dto.ts

    enums/
      sort-option.enum.ts
      location-type.enum.ts

    entities/
      search-history.entity.ts          // ORM mapping for search_history table

    __tests__/
      *.spec.ts

```

---

### 4.2 Data Model

### 4.2.1 Runtime Aggregation

Search does **not** maintain its own salon index in MVP:

- Salon metadata (name, address, city, coordinates, logo) comes from Salon module.
- Ratings come from Review module (cached aggregates).
- Price stats (min/max) come from Services (view or materialized view).
- AppCategory relations come from AppCategory module via denormalized relation.

---

### 4.2.2 Search History Table

```sql
CREATE TABLE search_history (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id),
  salon_id    UUID NOT NULL REFERENCES salons(id),
  last_query  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE search_history
  ADD CONSTRAINT uniq_search_history_user_salon
  UNIQUE (user_id, salon_id);

CREATE INDEX idx_search_history_user_updated
  ON search_history (user_id, updated_at DESC);

CREATE INDEX idx_search_history_created_at
  ON search_history (created_at);

```

- `last_query` is optional, used for analytics or smarter suggestions later.
- Unique constraint allows easy UPSERT on `(user_id, salon_id)`.

---

### 4.3 Geo + Distance Logic

### 4.3.1 Geo Source Priority

When processing `SearchRequestDto`, Search chooses geo strategy in this order:

1. **Viewport search** – if `viewport` provided:
    - Use bounding box filter.
    - Ignore `centerLat/centerLng`.
2. **Explicit center** – else if `centerLat` & `centerLng` provided:
    - Use circle search with smart radius.
3. **Geo-IP fallback** – else if no geo provided:
    - Try to resolve client IP → approx location.
    - If successful: treat as center and use circle search with smart radius.
4. **No geo filter** – if all above fail:
    - Search only by query + filters.

---

### 4.3.2 Viewport Search (map)

If `viewport` present:

```sql
WHERE s.latitude  BETWEEN :swLat AND :neLat
  AND s.longitude BETWEEN :swLng AND :neLng

```

- Optionally compute `distance_km` from viewport center (average of NE/SW).
- Sorting:
    - If `sortBy = 'distance'`, use `distance_km`.
    - Otherwise use rating / price / popular.

---

### 4.3.3 Circle Search (center + smart radius)

Circle search is used when:

- client passes `centerLat/centerLng`, or
- Geo-IP gives us a fallback center.

### Base radius configuration

Example values (configurable):

```tsx
const DEFAULT_RADIUS_KM = 3;
const MAX_RADIUS_KM = 15;
const MIN_RESULTS = 10;

const BASE_RADIUS_BY_LOCATION_TYPE: Record<LocationType, number> = {
  city: 7,
  neighborhood: 3,
  address: 2,
  poi: 3,
  unknown: DEFAULT_RADIUS_KM,
};

```

### Algorithm

1. **Base radius**
    
    ```tsx
    const baseRadius =
      dto.locationType
        ? BASE_RADIUS_BY_LOCATION_TYPE[dto.locationType]
        : DEFAULT_RADIUS_KM;
    let radiusKm = baseRadius;
    
    ```
    
2. **Run search with `radiusKm`**
    - Compute distance via Haversine (or Postgres extension):
        
        ```sql
        6371 * acos(
          cos(radians(:centerLat)) * cos(radians(s.latitude)) *
          cos(radians(s.longitude) - radians(:centerLng)) +
          sin(radians(:centerLat)) * sin(radians(s.latitude))
        ) AS distance_km
        
        ```
        
    - Filter:
        
        ```sql
        WHERE distance_km <= :radiusKm
        
        ```
        
3. **Auto-expansion**
    - If results `< MIN_RESULTS` and `radiusKm < MAX_RADIUS_KM`:
        - Increase radius (e.g. `radiusKm *= 2`, but cap at `MAX_RADIUS_KM`).
        - Re-run query.
    - Repeat until we either:
        - have at least `MIN_RESULTS`, or
        - hit `MAX_RADIUS_KM`.
4. **Return**
    - Return results for the final radius.
    - Optionally include `effectiveRadiusKm` in response meta.

---

### 4.3.4 Geo-IP Fallback

If neither `viewport` nor `centerLat/centerLng` is present:

- `GeoLocationService` may perform a Geo-IP lookup using:
    - request IP or `X-Forwarded-For` header.
- If successful:
    - Treat coordinates as internal `centerLat/centerLng`.
    - Set `locationType = 'city'` or `'unknown'` depending on precision.
    - Use the same circle + smart radius logic.
- If Geo-IP fails:
    - Skip geo filter completely.

This logic is entirely **internal**; API doesn’t expose Geo-IP fields.

---

### 4.4 Filters

### 4.4.1 Time Filter (MVP)

- Used when both `date` and `time` present.
- Convert to **weekday + local time** for each salon.
- Use Salon open-hours metadata to determine open/closed.
- Include only salons open at that time.
- No integration with Booking or CRM availability in MVP.

---

### 4.4.2 Price Filter

- Uses aggregated price info per salon, e.g. `min_price_cents`, `max_price_cents`.
- Filter logic:
    
    ```tsx
    if (priceMin != null) min_price_cents >= priceMin * 100;
    if (priceMax != null) max_price_cents <= priceMax * 100;
    
    ```
    
- Details (view/materialized view) live in Services module; Search just consumes it.

---

### 4.4.3 AppCategory Filter

- When `appCategoryIds` is provided:
    - Search returns only salons that are mapped to at least one of those AppCategories.

Implementation concept:

- AppCategory module maintains mapping from salons/local categories to canonical `app_category_id`.
- Search reads from a denormalized relation or view, e.g.:
    
    ```sql
    salon_app_categories(salon_id, app_category_id)
    
    ```
    
- Query builder adds:
    
    ```sql
    JOIN salon_app_categories sac ON sac.salon_id = s.id
    WHERE sac.app_category_id = ANY(:appCategoryIds)
    
    ```
    
- 

This allows Search to stay agnostic of the internal mapping logic.

---

### 4.5 Sorting (Sort Registry Pattern)

`sortBy` options:

```tsx
export enum SortOptionEnum {
  DISTANCE = 'distance',
  RATING_DESC = 'rating_desc',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  POPULAR = 'popular',
}

```

Registry:

```tsx
type SortStrategy = (qb: QueryBuilder) => void;

const SORT_REGISTRY: Record<SortOptionEnum, SortStrategy> = {
  [SortOptionEnum.DISTANCE]: (qb) => {
    qb.orderBy('distance_km', 'asc');
  },
  [SortOptionEnum.RATING_DESC]: (qb) => {
    qb.orderBy('rating', 'desc').orderBy('rating_count', 'desc');
  },
  [SortOptionEnum.PRICE_ASC]: (qb) => {
    qb.orderBy('min_price_cents', 'asc');
  },
  [SortOptionEnum.PRICE_DESC]: (qb) => {
    qb.orderBy('min_price_cents', 'desc');
  },
  [SortOptionEnum.POPULAR]: (qb) => {
    qb.orderBy('booking_count_30d', 'desc');
  },
};

function applySort(qb: QueryBuilder, sortBy?: SortOptionEnum) {
  const key = sortBy ?? SortOptionEnum.DISTANCE;
  (SORT_REGISTRY[key] ?? SORT_REGISTRY[SortOptionEnum.DISTANCE])(qb);
}

```

Adding a new sort = add enum value + one function.

---

### 4.6 History Behaviour

**When do we save history?**

- Only when user **opens salon details** (from search, list, or anywhere relevant).
- Some upstream layer (Salon controller or a dedicated “track view” endpoint) calls:

```tsx
SearchHistoryService.addVisit(userId: string, salonId: string, lastQuery?: string);

```

**addVisit** performs UPSERT:

- If `(user_id, salon_id)` exists:
    - update `updated_at` and `last_query`.
- Else:
    - insert a new row.

**History listing**

- `GET /search/history` returns entries ordered by `updated_at DESC`.

**History deletion**

- `DELETE /search/history` → delete where `user_id = currentUser.id`.
- `DELETE /search/history/:id` → delete where `id = :id AND user_id = currentUser.id`.

History represents **“salons I actually looked at”**, not mere search impressions.

---

### 4.7 Suggestions Behaviour

`SearchSuggestionsService.getSuggestions(userId, query?)`:

1. Fetch recent history for user (limit N).
2. If `query` empty:
    - Map history to `type: 'history'` suggestions and return.
3. If `query` present:
    - Filter history salons whose name contains query.
    - Query salons table for name matches (and maybe city name).
    - Build list:
        - History matches → `type: 'history'`.
        - New matches → `type: 'salon'`.
    - De-duplicate by `salonId`.
    - Limit total suggestions.

Results are `SearchSuggestionDto[]` with `logoUrl` populated when available.

---

## 5. Interactions with Other Modules

- **Salon Module**
    - Source of truth for salon metadata (name, address, city, coordinates, logo, open-hours).
    - Search uses it as the primary entity set.
- **Review Module**
    - Provides rating aggregates (`rating`, `rating_count`) used for sorting and display.
- **Services Module**
    - Provides pricing info; Search uses per-salon aggregated stats for price filters and price-based sorting.
- **AppCategory Module**
    - Maintains canonical categories and mappings between local categories/services and AppCategories.
    - Search consumes a denormalized mapping to filter salons by `appCategoryIds`.
- **Booking Module** (future)
    - Will provide popularity (booking counts) and, later, real availability.
- **CRMIntegration Module** (future)
    - Will feed Booking with CRM-based availability and booking data.
- **Auth / User Module**
    - Required for history & suggestions to identify user (`user_id`).
- **API Gateway**
    - Propagates client IP (or `X-Forwarded-For`) to Search, so Geo-IP fallback can work.