# Beautyn API — Architecture & Features

B2B2C beauty salon marketplace backend. Connects salon owners with clients through a unified booking and search platform, integrating multiple CRM providers (Altegio, EasyWeek) for two-way data synchronization.

**Stack:** NestJS 11 | TypeScript 5.7 | Prisma 6 | PostgreSQL | Supabase Auth | BullMQ + Redis | Winston

---

## Architecture

### API Gateway Pattern

All HTTP traffic flows through `ApiGatewayModule` which routes to three API layers:

- **PublicApiModule** (`/api/v1/`) — unauthenticated endpoints (auth, salon search, public listings)
- **AuthenticatedApiModule** (`/api/v1/`) — protected by `JwtAuthGuard` + role guards (user, brand, booking management)
- **InternalApiModule** (`/api/v1/internal/`) — service-to-service with API key guard (`x-internal-key` header)

### CRM Integration Layer

Abstract provider pattern in `libs/crm/` supports multiple CRM systems through a unified interface:

- **ProviderFactory** — dynamically selects Altegio or EasyWeek adapter based on salon configuration
- **CapabilityRegistry** — runtime feature detection per provider (not all CRMs support all operations)
- **TokenStorage** — encrypted credential storage (AES-256-GCM with IV + auth tag)
- **AccountRegistry** — non-secret CRM account metadata (JSON)
- **SyncScheduler** — BullMQ-based job scheduling for background sync workers
- **RetryHandler** — exponential backoff retry logic for CRM API calls

### Background Workers

Standalone BullMQ worker processes consume from Redis queues:

| Worker | Purpose |
|--------|---------|
| `initial-sync` | First-time complete sync of all entities from CRM |
| `categories-sync` | Periodic sync of service categories |
| `services-sync` | Periodic sync of services/treatments |
| `workers-sync` | Periodic sync of staff members |
| `bookings-sync` | Periodic sync of bookings/appointments |
| `salons-sync` | Periodic sync of salon metadata |
| `cron-diff` | Detects CRM changes and creates change proposals |

Each worker has a corresponding processor in `src/workers/processors/` that handles provider-specific logic.

### Sync Reconciliation (Outbox Pattern)

Reliable delivery to CRMs via outbox pattern in `src/sync-reconciliation/`:

- **SyncShadow** — stores last-known remote state for drift detection
- **SyncOutbox** — queues outbound operations (create/update/delete) for durable delivery
- **OutboxProcessor** — BullMQ consumer that processes outbox entries with retry
- **Conflict resolution** — merge policies: APP wins, CRM wins, or AUTO

### Response Envelope

All responses wrapped uniformly:

```
Success: { success: true, data: T }
Error:   { success: false, data: {...}, debug?: { status, method, url, message, stack } }
```

Debug info controlled by `ERROR_DETAILS_ENABLED` env variable.

---

## Project Structure

```
src/
  api-gateway/          # Route controllers organized by access level
    v1/
      public/           # Unauthenticated endpoints
      authenticated/    # JWT-protected endpoints
      internal/         # Service-to-service endpoints
  auth/                 # Supabase auth (login, register, password reset)
  user/                 # User profile management
  brand/                # Multi-salon brand/organization management
  salon/                # Salon CRUD and CRM linking
  categories/           # Service categories (synced from CRM)
  services/             # Salon services/treatments with pricing
  workers/              # Staff members and processors for sync jobs
  booking/              # Booking management
    altegio-booking/    # Altegio-specific booking logic
    easyweek-booking/   # EasyWeek-specific booking logic
  search/               # Geolocation-based salon search
  onboarding/           # CRM connection wizard
  app-categories/       # App-managed category taxonomy with auto-mapping
  crm-integration/      # CRM abstraction layer, webhooks, API clients
  crm-salon-changes/    # Change proposal system (pending/accepted/dismissed)
  sync-reconciliation/  # Outbox pattern for reliable CRM delivery
  shared/               # Global guards, filters, interceptors, validators, config

libs/
  crm/
    provider-core/      # Abstract CRM provider interface
    capability-registry/ # Dynamic capability detection per provider
    token-storage/      # Encrypted credential storage
    account-registry/   # Non-secret CRM account metadata
    sync-scheduler/     # BullMQ job scheduling and worker definitions
    retry-handler/      # Exponential backoff retry logic
    adapter/            # High-level CRM operations layer
  shared/
    logger/             # Winston logging with request correlation

prisma/                 # Schema and migrations
supabase/               # Supabase configuration
docs/                   # Feature documentation (CRM sync, booking, phone validation)
test/                   # Unit and E2E tests
scripts/                # Utility scripts
```

---

## Domain Model

### Core Entities

- **Users** — role: `client | owner | admin`, linked to subscription plan
- **Brand** — multi-salon organization
- **BrandMember** — team members with roles: `owner | manager | support`
- **Salon** — individual location with CRM provider link (`ALTEGIO | EASYWEEK`), geo-coordinates, pricing, hours, ratings
- **SalonImage** — gallery images with sort order
- **Category** — service category per salon, linked to CRM category ID
- **Service** — treatment with price (cents), duration, currency, worker assignments
- **Worker** — staff member with photo, schedule, specializations
- **WorkerService** — many-to-many: workers to services
- **Booking** — appointment record with provider-specific metadata
- **BookingHistory** — version history with diffs for audit trail

### CRM Entities

- **CrmCredential** — encrypted secrets (AES-256-GCM)
- **CrmAccount** — non-secret metadata (JSON)
- **CrmPairingCode** — one-time codes for CRM connection (6-digit, HMAC-SHA256, 10-min expiry)
- **CrmSalonChangeProposal** — detected changes awaiting approval (pending/accepted/dismissed/expired)
- **CrmSalonSnapshot** — complete salon snapshots with payload hash

### Sync Entities

- **SyncShadow** — last-known remote state per entity
- **SyncOutbox** — outbound operations queue
- **CategoryMapping / ServiceMapping / WorkerMapping** — internal ID to external ID mappings

### Other

- **SearchHistory** — user search queries linked to visited salons
- **AppCategory** — standardized beauty category taxonomy
- **SalonCategoryMapping** — maps salon categories to app categories with confidence score
- **SubscriptionPlan** — billing tiers (name, price_cents, currency, duration_days, features)
- **OnboardingStep** — multi-step onboarding progress tracking

---

## Key Features

### Authentication & Authorization

- **Provider:** Supabase Auth (email/password, JWT access + refresh tokens)
- **Token validation:** `auth.getUser(token)` on every protected request
- **Guard chain:** JwtAuthGuard -> RolesGuard (owner/admin/client) -> Resource guards (SalonOwnerGuard, BrandAccessGuard, CategoryOwnerGuard, UserOwnershipGuard)

### Brand & Salon Management

- Create brands, add team members with roles
- Link salons to CRM providers during onboarding
- Manage salon metadata, images, working hours
- One brand per owner (enforced)

### CRM Integration

- **Two-way sync** with Altegio and EasyWeek
- **Onboarding flow:** discover CRM locations -> pair via code/token -> trigger initial sync
- **Altegio webhooks** for real-time booking updates with signature validation
- **Change proposals:** CRM drift detection creates proposals for owner review (accept/dismiss)
- **Encrypted credentials:** AES-256-GCM storage for CRM tokens

### Booking Management

- Create and track bookings through CRM providers
- Provider-specific detail models (Altegio: 30+ fields, staff, client, services, documents; EasyWeek: orders, links, ordered services)
- Booking history with version tracking and diffs
- Status lifecycle: created -> completed/canceled
- Query by status, date range, client/owner

### Geolocation Search

- Center-based (lat/long) or GeoIP-based salon discovery
- Dynamic radius expansion (starts small, expands by 1.5x if too few results)
- Filters: distance, service type, rating, open status, price range
- Sorting: distance, relevance, rating
- Search history tracking

### Onboarding

- Multi-step wizard: CRM connection -> Brand setup -> Subscription -> Complete
- EasyWeek: location discovery + token-based linking
- Altegio: 6-digit pairing code (HMAC-SHA256, 10-min expiry) + webhook confirmation
- Triggers initial data sync (categories, services, workers)

---

## API Routes

```
/api/v1/
  auth/                    POST login, register, logout, forgot, reset
  user/                    GET me, PATCH update
  salons/                  GET search, GET :id
  salons/authenticated/    Owner/admin salon operations
  bookings/                GET client bookings
  bookings/owner/          Owner/admin booking operations
  categories/              GET/POST/PATCH/DELETE
  services/                GET/POST/PATCH/DELETE
  workers/                 GET/POST/PATCH/DELETE
  app-categories/          GET standardized categories
  search/                  GET geolocation search
  onboarding/              GET progress, POST discover/finalize/pair/sync
  brand/                   POST create, GET my, GET :id, PATCH :id
  altegio-booking/         POST create booking, POST webhook
  easyweek-booking/        POST confirm booking
  crm-salon-changes/       GET proposals, PATCH accept/reject

/api/v1/internal/          API-key protected service-to-service
```

**Swagger:** available at `/api/docs` (JSON at `/api-json`)

---

## Cross-Cutting Concerns

- **Logging:** Winston with structured JSON logs, request correlation IDs via `RequestCorrelationMiddleware`, child logger factory per context. Configured via `LOG_LEVEL`, `LOG_PRETTY`, `SERVICE_NAME`.
- **Validation:** Global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted`, `transform`, `enableImplicitConversion`. Custom validators: `@IsValidPhone()` (libphonenumber-js), `@IsAllowedAvatarDomain()`.
- **Error handling:** `EnvelopeExceptionFilter` wraps all exceptions in envelope format. Debug details controlled by `ERROR_DETAILS_ENABLED`.
- **Response transform:** `TransformInterceptor` wraps all successful responses in `{ success: true, data: T }`.
- **Password hashing:** Argon2 via `HashService`.
- **Phone formatting:** libphonenumber-js for international phone number validation.

---

## Database

- **ORM:** Prisma 6 with PostgreSQL
- **Connection pooling:** PgBouncer (port 6543 for app queries, port 5432 direct for migrations)
- **Schema:** `prisma/schema.prisma`
- **Repository pattern:** per-domain repositories (e.g., `brand.repository.ts`, `user.repository.ts`)
- **Transactions:** `prisma.$transaction()` for multi-entity operations
- **Soft deletes:** `deletedAt` field on salons

### Migration Commands

```bash
npm run db:dev:migrate      # Create new migration
npm run db:dev:deploy       # Apply pending migrations
npm run db:dev:reset        # Reset database
npm run db:dev:status       # Check migration status
npm run db:stage:migrate    # Staging migrations
npm run db:prod:deploy      # Production deployment
```

---

## Development

### Environment Setup

Environment files loaded by `NODE_ENV`: `.env.local`, `.env.dev`, `.env.staging`, `.env.production`, `.env.test`. Falls back to `.env`.

### Key npm Scripts

```bash
# Start
npm run up:local            # API + all workers + Redis
npm run start:dev           # Dev with watch mode

# Build
npm run build               # prisma generate + nest build + tsc-alias

# Test
npm run test                # Unit tests
npm run test:e2e            # E2E tests
npm run test:cov            # Coverage report

# Workers (per environment: local/dev/stage/prod)
npm run worker:initial:local
npm run worker:categories:local
npm run worker:services:local
npm run worker:workers:local
npm run worker:bookings:local
npm run worker:salons:local
npm run worker:cron:local
npm run worker:local        # All workers concurrently

# Database
npm run db:dev:migrate
npm run db:dev:deploy
```

### Local Redis

```bash
docker compose up -d redis   # Start Redis (port 6379)
npm run local:redis:down     # Stop Redis
```

### Worker Configuration

| Variable | Purpose |
|----------|---------|
| `CRM_WORKER_CONCURRENCY` | Concurrent jobs per worker |
| `CRM_SYNC_RATE_MAX` | Rate limiting max requests |
| `CRM_SYNC_RATE_DURATION_MS` | Rate limit window |
| `CRM_RETRY_ATTEMPTS` | Max retry attempts |
| `CRM_RETRY_BASE_DELAY_MS` | Base delay for exponential backoff |
| `CRM_RETRY_MAX_DELAY_MS` | Max delay cap |
| `CRM_SYNC_DEFAULT_CRON` | Default cron schedule for sync |

### Deployment

- **Platform:** Railway (PaaS)
- **Entry point:** `dist/src/main.js`
- **Build:** `npm run build:railway`
- **No Dockerfile** — uses Railway's Node.js runtime
