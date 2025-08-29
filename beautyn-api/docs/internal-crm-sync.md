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

