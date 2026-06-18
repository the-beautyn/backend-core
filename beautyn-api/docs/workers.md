# CRM Workers & Sync

How beautyn-api keeps local data in sync with the salons' CRMs (Altegio / EasyWeek). All sync work
runs in **BullMQ workers** backed by Redis. The workers don't touch the DB directly — they pull from
the CRM and/or call **internal HTTP endpoints** on the API, which do the persistence.

- [The 7 workers](#the-7-workers)
- [How jobs flow](#how-jobs-flow)
- [Two-lane bookings poller](#two-lane-bookings-poller) (the only scheduled/autonomous part)
- [Internal sync API](#internal-sync-api)
- [Configuration](#configuration)
- [Running the workers per environment](#running-the-workers-per-environment)
- [CRM rate limits](#crm-rate-limits)
- [Operations & troubleshooting](#operations--troubleshooting)

---

## The 7 workers

Each worker is its **own process** draining **one queue**. They're defined in
`libs/crm/sync-scheduler/src/workers/` and launched via `npm run worker:*` scripts.

| Worker | Queue | Pulls from CRM → calls | Triggered by | Scheduled? |
|---|---|---|---|---|
| `initial` | `crm-sync` | salon + categories + services + workers → `/internal/{salons,categories,services,workers}/sync` | onboarding (`enqueueInitialSync`) | on-demand |
| `categories` | `crm-categories` | categories → `/internal/categories/sync` | `enqueueCategoriesSync` / slow lane | on-demand |
| `services` | `crm-services` | services → `/internal/services/sync` | `enqueueServicesSync` / slow lane | on-demand |
| `workers` | `crm-workers` | staff → `/internal/workers/sync` | `enqueueWorkersSync` / slow lane | on-demand |
| `bookings` | `crm-bookings` | → `/internal/bookings/rebase` | owner "sync now" + **fast/slow lane dispatch** | on-demand + **timer** |
| `salons` | `crm-salons` | → `/internal/salons/pull` (creates **change-proposals**, not overwrites) | `enqueueSalonSync` / slow lane | on-demand |
| `cron` | `crm-cron-diff` | (registers + fires the lane ticks) → `/internal/sync/dispatch` | **its own repeatable schedules** | **scheduled** |

**The only autonomous/scheduled piece is the `cron` worker.** Everything else only runs when an app
event (onboarding, an owner tapping "sync now", or a lane dispatch) enqueues a job. There are no
`@Cron`/`@nestjs/schedule` timers anywhere; scheduling is done entirely with BullMQ repeatable jobs
registered by the `cron` worker.

---

## How jobs flow

- **One queue per concern**, deterministic `jobId = sync:<type>[:<lane>]:<provider>:<salonId>`.
  Re-enqueuing the same id while a job is still active/waiting is a no-op → **overlap protection**
  (a salon already syncing won't be double-queued).
- **Concurrency**: each worker runs `CRM_WORKER_CONCURRENCY` jobs in parallel (set to `5`).
- **Rate limit**: queues share a BullMQ limiter (`CRM_SYNC_RATE_MAX` per `CRM_SYNC_RATE_DURATION_MS`,
  default 5/sec) to stay under CRM per-IP limits.
- **Retries**: jobs use `attempts: 5`; CRM calls additionally use `executeWithRetry` and respect 429
  / `Retry-After`.

---

## Two-lane bookings poller

**Why:** salon owners can cancel a booking **on the CRM side**, and users who cancel via the Safari
widget bypass our in-app handling — leaving us holding a booking the customer no longer has. The
poller's real job is **cancellation detection on upcoming bookings**.

Two cadences, fanned out per salon by the `cron` worker:

| | Fast lane (every 2 min) | Slow lane (every 90 min) |
|---|---|---|
| **Altegio bookings** | records in `[now, now+7d]`; purge scoped to that window | `[now−2d, furthest booking]`; purge all future |
| **EasyWeek bookings** | active bookings in `[now, now+48h]`, soonest-first, **capped at 90** | all known bookings |
| **Catalog** (categories/services/workers/salon) | — | **also refreshed** (categories/services/workers/salon) |
| **Priority** | high (`1`) | low (`5`) |

The EasyWeek cap exists because EasyWeek pulls each booking individually at ~1s; 90 ≈ 90s, inside the
2-min tick. Ordering soonest-first means the cap only drops the *furthest* bookings (the slow lane
still covers them); the most imminent are always synced.

### Data flow
```
[cron worker]  ← run ONE instance
   on boot (if BOOKINGS_LANES_ENABLED): registerSyncLaneSchedules()
     → 2 repeatable BullMQ jobs on crm-cron-diff:
         fast  every 120000ms   {lane:'fast'}
         slow  every 5400000ms  {lane:'slow'}
   on each tick → POST /api/v1/internal/sync/dispatch {lane}
                                          │
[API] dispatch ──────────────────────────┘  CrmIntegrationService.dispatchLane(lane):
   list active CRM salons (provider + externalSalonId set, not deleted)
   → per salon: scheduleSync({salonId, provider, lane}, {type:'bookings'})   (priority fast:1/slow:5)
   → if slow: also scheduleSync {type: categories|services|workers|salon}
                                          │
[crm-bookings] bookings worker (concurrency 5) ┘
   POST /api/v1/internal/bookings/rebase {salon_id, lane}  → rebaseFromCrm applies the lane scope
[crm-categories|services|workers|salons] their workers drain the catalog jobs in parallel (isolated)
```

Catalog jobs go to their **own queues/workers**, so the slow-lane catalog refresh has **zero impact
on the fast bookings lane**. Salon sync produces **change-proposals** (`crm-salon-changes` diff), not
silent overwrites — so a 90-min salon refresh keeps regenerating proposals for review.

### Fast vs slow isolation
One `crm-bookings` queue, fast jobs at higher priority + `CRM_WORKER_CONCURRENCY=5`, so a long slow
job can't starve the fast lane (priority orders the *queue*; concurrency keeps slots free).

---

## Internal sync API

System-only endpoints (guarded by `InternalApiKeyGuard`, header `x-internal-key`). Called by the
workers; not owner-reachable.

| Endpoint | Caller | Purpose |
|---|---|---|
| `POST /api/v1/internal/sync/dispatch` `{lane}` | `cron` worker | fan a lane tick out to per-salon jobs |
| `POST /api/v1/internal/bookings/rebase` `{salon_id, lane?}` | `bookings` worker | reconcile bookings (no `lane` → full/slow) |
| `POST /api/v1/internal/categories/sync` | `categories`/`initial` | upsert categories |
| `POST /api/v1/internal/services/sync` | `services`/`initial` | upsert services |
| `POST /api/v1/internal/workers/sync` | `workers`/`initial` | rebase staff |
| `POST /api/v1/internal/salons/pull` | `salons` | diff salon → change-proposals |
| `POST /api/v1/internal/salons/sync` | `initial` | upsert salon from CRM |

> Note: the old `/internal/crm/:provider/:salonId/sync` and `/cron` routes are **commented out** in
> `crm-internal.controller.ts` — they are not live.

**Owner-facing manual sync (unchanged, full reconcile, not lane-aware):**
- `POST /api/v1/salons/:salonId/bookings/sync` — blocking, returns synced bookings.
- `POST /api/v1/salons/:salonId/bookings/sync/async` — enqueues a `crm-bookings` job, returns `{jobId}`.

Example (internal):
```bash
KEY=$(grep '^INTERNAL_API_KEY=' .env.local | cut -d= -f2- | tr -d '"')
curl -s -X POST http://127.0.0.1:3000/api/v1/internal/sync/dispatch \
  -H "x-internal-key: $KEY" -H 'content-type: application/json' -d '{"lane":"fast"}'
# → {"enqueued":N,"catalog":M,"total":N}
```

The catalog/initial workers pull from Provider Core and POST a normalized payload per type. e.g.
`POST /internal/workers/sync` → `{ salonId, workers: [{ crmWorkerId, firstName, lastName, position,
email, phone, photoUrl, isActive, workingSchedule? }] }`, forwarded to `WorkersService.syncFromCrm`
which rebases local staff and returns `{ workers, upserted, deleted }`. Categories/services follow the
same shape (`{ salon_id, categories|services: [...] }`).

---

## Configuration

Read from env with code defaults — only set overrides. **Which process reads each matters on
Railway**, where API and workers are separate services with separate variables.

| Variable | Default | Read by | Purpose |
|---|---|---|---|
| `BOOKINGS_LANES_ENABLED` | `false` | **worker** (cron) | master switch — registers the schedules. Must be `true` to poll. |
| `CRM_WORKER_CONCURRENCY` | `1` → set **`5`** | **worker** | parallel jobs per worker |
| `BOOKINGS_FASTLANE_EVERY_MS` | `120000` | **worker** (cron) | fast interval (2 min) |
| `BOOKINGS_SLOWLANE_EVERY_MS` | `5400000` | **worker** (cron) | slow interval (90 min) |
| `BOOKINGS_FASTLANE_ALTEGIO_HORIZON_DAYS` | `7` | **API** | Altegio fast window |
| `BOOKINGS_FASTLANE_EASYWEEK_HORIZON_HOURS` | `48` | **API** | EasyWeek fast window |
| `BOOKINGS_FASTLANE_EASYWEEK_MAX` | `90` | **API** | EasyWeek per-run cap |
| `INTERNAL_API_BASE_URL` | — | **worker** | URL workers call (must reach the API) |
| `INTERNAL_API_KEY` | — | worker + API | shared internal auth |
| `REDIS_URL` | — | all | BullMQ connection |
| `CRM_SYNC_RATE_MAX` / `CRM_SYNC_RATE_DURATION_MS` | `5` / `1000` | queues | global rate limiter |

**Enable** (per env): `BOOKINGS_LANES_ENABLED=true` + `CRM_WORKER_CONCURRENCY=5`, then restart the
cron/worker process. **Kill switch:** `BOOKINGS_LANES_ENABLED=false` + restart the cron worker — all
polling stops, no redeploy.

---

## Running the workers per environment

Each env loads `.env.<env>` via `dotenv -e`. **On Railway, env vars come from the dashboard, not the
`.env.*` files** (those are gitignored / local-only).

### Local / dev / staging
```bash
# everything (API + Redis + all 7 workers) in one terminal:
npm run up:local        # or up:dev / up:stage

# or split — API in one terminal, all workers in another:
npm run start:local:redis      # API (+ docker redis)
npm run worker:local           # all 7 workers (concurrently)

# or a single worker (clean logs while debugging the lanes):
npm run worker:cron:local      # the autonomous timer
npm run worker:bookings:local  # per-salon bookings jobs
```
Swap the suffix for the env: `:dev`, `:stage`. The `cron` worker prints
`Sync lane schedules registered (fast + slow)` on boot when enabled.

### Production (Railway)
Two services from the same repo:
- **API service** → start command `npm run start:prod` (serves `/internal/sync/dispatch` + `/rebase`).
- **Worker service** → start command `npm run worker:prod` (runs **all 7** workers via `concurrently`,
  including `cron` + `bookings`). The `cron` worker must run as a **single instance** (it's the
  scheduler).

To turn the poller on in prod:
1. **Worker service** vars: `BOOKINGS_LANES_ENABLED=true`, `CRM_WORKER_CONCURRENCY=5`, and
   `INTERNAL_API_BASE_URL` = the API's reachable URL (public domain or
   `http://<api-service>.railway.internal:<port>`), `INTERNAL_API_KEY` matching the API.
2. **API service** vars (optional overrides): the `BOOKINGS_FASTLANE_*` knobs — defaults are fine.
3. Redeploy/restart the worker service.

> `worker:prod` runs via `ts-node` (a devDependency). If the worker service installs prod-only deps,
> `ts-node`/`tsconfig-paths` won't exist and it'll crash on boot — make sure devDependencies install.

---

## CRM rate limits

- **Altegio:** **200 req/min or 5 req/s — per IP** (shared across all salons; reads `Retry-After`).
  A bookings sync is ~1 request/salon → safe into the hundreds of salons.
- **EasyWeek:** no published number; self-throttled to **1 req/s** (1000ms/booking). Treat as a low
  ceiling — this is why `CRM_WORKER_CONCURRENCY` stays single-digit.
- **EasyWeek webhooks (future):** EasyWeek supports cancellation webhooks on the PRO plan — the
  eventual replacement for EasyWeek booking polling.

---

## Operations & troubleshooting

- **Logs go to stdout only** (Console transport — no log file). Under `concurrently`, look for the
  colored worker-name prefixes: `cron`, `bookings`, `api`. Redirect to capture:
  `npm run worker:cron:local 2>&1 | tee /tmp/cron.log`.
- **Autonomous chain to watch:** `dispatch tick` (cron) → `dispatch fan-out {enqueued,catalog,total}`
  (api) → `Bookings sync started/completed` (bookings).
- **Capacity warning** `EasyWeek fast-lane capacity exceeded {salonId,eligible,cap,...}` → a salon has
  more in-horizon bookings than the fast lane can pull in one tick; overflow rolls to later ticks /
  the slow lane. Fix: shorten `…HORIZON_HOURS`, raise `…MAX`, or move toward webhooks.
- **Queue depth** (the inspect script only covers `crm-sync`; peek the others via Redis):
  ```bash
  R='redis://:devpass@localhost:6380'
  redis-cli -u $R llen  bull:crm-bookings:wait
  redis-cli -u $R zrange bull:crm-cron-diff:repeat 0 -1   # registered fast/slow ticks
  ```
- **Jobs piling up?** A queue with a growing `:wait` and nothing draining means that worker isn't
  running. In prod that usually means the worker service isn't deployed.
- **Failed CRM fetch ≠ cancellation:** a thrown fetch aborts before the purge step, so an outage is
  never misread as "everything cancelled."
- **DB pool:** the app uses the Supabase PgBouncer pooler (transaction mode, small shared pool) —
  don't push `CRM_WORKER_CONCURRENCY` into double digits or concurrent transactions can exhaust it.
