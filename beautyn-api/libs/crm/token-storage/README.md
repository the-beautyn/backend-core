# Token Storage (AES-256-GCM)

Encrypted persistence for **secrets only** per (salonId, provider).

## Provider matrix
- **ALTEGIO**: _No secret stored here._ Provider Core uses env:
  - `ALTEGIO_BEARER`
  - `ALTEGIO_USER`
  Store `externalSalonId` in Account Registry.
- **EASYWEEK**: Store `{ apiKey: string }` here. Store `workspaceSlug`, `locationId` in Account Registry.

## Env
- `NODE_CRM_MASTER_KEY` — 64 hex chars (32 bytes). Example:
  `openssl rand -hex 32`

## API
`TokenStorageService.get/store/delete(salonId, provider, bundle)`

> Never log tokens. Keep secrets in this service; non-secrets go to Account Registry.

