# CRM Adapter

Single façade for the Application Layer:
- **requestSync** — trigger a full sync *now* for a salon/provider
- **ensureCronSync** — ensure a repeating sync via CRON (e.g., every 2 hours)
- Booking lifecycle with capability checks, retry, and circuit breaker

## Quick examples

```ts
// Full sync now
await adapter.requestSync(salonId, CrmType.EASYWEEK, requestId);

// Every 2 hours (Cron: minute 0, every 2nd hour)
await adapter.ensureCronSync(salonId, CrmType.EASYWEEK, '0 */2 * * *', 'Europe/Kyiv');
```

This package doesn't call vendor HTTP directly — Provider Core does that.
