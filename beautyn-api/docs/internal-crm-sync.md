# Internal CRM Sync API

## Trigger full sync now
```bash
curl -X POST "http://localhost:3000/api/v1/internal/crm/EASYWEEK/11111111-1111-1111-1111-111111111111/sync" \
  -H "x-internal-key: dev-internal-key-123"
```

## Ensure CRON sync (every 2 hours)
```bash
curl -X PUT "http://localhost:3000/api/v1/internal/crm/EASYWEEK/11111111-1111-1111-1111-111111111111/cron" \
  -H "x-internal-key: dev-internal-key-123" \
  -H "Content-Type: application/json" \
  -d '{"cron":"0 */2 * * *","tz":"Europe/Kyiv"}'
```

## Workers sync payload

The Sync Scheduler enqueues `workers-sync` jobs when categories/services/initial sync is triggered with `{ type: 'workers' }`. Jobs use Provider Core to pull staff list and POST it to the internal API:

```
POST /api/v1/internal/workers/sync
Headers: x-internal-key, content-type: application/json
Body:
{
  "salonId": "<salon-uuid>",
  "workers": [
    {
      "crmWorkerId": "701",
      "firstName": "Alice",
      "lastName": "Brown",
      "position": "Master",
      "email": "alice@example.com",
      "phone": "+4912345678",
      "photoUrl": "https://...",
      "isActive": true,
      "workingSchedule": {
        "timezone": "Europe/Kyiv",
        "days": [
          { "weekday": 1, "isDayOff": false, "intervals": [{ "start": "09:00", "end": "18:00" }] }
        ]
      }
    }
  ]
}
```

The internal controller forwards the payload to `WorkersService.syncFromCrm`, which rebases local staff records and returns `{ workers, upserted, deleted }`.
