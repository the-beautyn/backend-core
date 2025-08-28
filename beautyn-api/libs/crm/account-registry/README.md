# Account Registry (non-secret CRM config)

Stores provider-specific, non-secret identifiers per (salonId, provider).

## Stored fields
- ALTEGIO: externalSalonId (int)
- EASYWEEK: workspaceSlug (string), locationId (UUID string)

Secrets (e.g., EasyWeek apiKey) belong in Token Storage.

## API
- get(salonId, provider)
- setAltegio(salonId, { externalSalonId })
- setEasyWeek(salonId, { workspaceSlug, locationId })

