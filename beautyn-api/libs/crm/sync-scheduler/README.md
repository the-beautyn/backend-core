# Sync Scheduler

Queues + processors for CRM sync:
- Queue: `crm-sync`
- Jobs: `sync`, `cron-diff`, `bookings-dispatch`

## Service API
- `scheduleSync({ salonId, provider, requestId?, lane? }) -> jobId` — `lane` ('fast'|'slow') adds a
  jobId segment and sets BullMQ priority (fast=1, slow=5).
- `scheduleCronDiff({ salonId, provider, cron?, tz?, requestId? })`
- `registerBookingsDispatchSchedules()` — upserts the repeatable fast/slow bookings-dispatch ticks
  on `crm-cron-diff` (called from the cron worker boot when `BOOKINGS_LANES_ENABLED`).

Workers call ProviderFactory -> (pull*/sync*) wrapped with retry.

For the workers/queues overview and the end-to-end two-lane bookings poller, see
[docs/workers.md](../../../docs/workers.md).

