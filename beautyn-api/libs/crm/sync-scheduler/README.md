# Sync Scheduler

Queues + processors for CRM sync:
- Queue: `crm-sync`
- Jobs: `sync`, `cron-diff`

## Service API
- `scheduleSync({ salonId, provider, requestId? }) -> jobId`
- `scheduleCronDiff({ salonId, provider, cron?, tz?, requestId? })`

Workers call ProviderFactory -> (pull*/sync*) wrapped with retry.

