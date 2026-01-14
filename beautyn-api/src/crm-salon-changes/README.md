# CRM Salon Change Detection

The **CRM Salon Changes** module is responsible for tracking field-level differences between the external CRM payload and the last synced CRM snapshot. It never mutates the salon directly during detection—every change is surfaced as an explicit proposal that must be accepted.

## How Detection Works

1. `CrmSalonDiffService.detectChanges(salonId, provider, payload)` loads the last CRM snapshot for the salon/provider.
2. The incoming CRM payload is canonicalized per tracked field (trim strings, treat arrays as sets, round geo coordinates, collapse empty values to `null`).
3. Each field’s canonical value is hashed (SHA‑256). Hashes are compared against `crm_salon_last_hash`.
   - First pull: hashes are stored but no proposals are created.
   - Subsequent pulls: if the CRM value differs from the **previous CRM snapshot**, a pending proposal is stored in `crm_salon_change_proposal` and the hash baseline is advanced.
4. The full CRM payload is stored in `crm_salon_snapshot` and is used as the comparison baseline for future syncs.

## Resolution Flow

- `acceptChange(id, actorId)` re-validates ownership, blocks `externalId`, applies the specific field patch to `salons`/`salon_images`, and marks the proposal **accepted**.
- `dismissChange(id, actorId)` simply marks the proposal **dismissed**.
- `listChanges(actorId, salonId, status?)` returns filtered proposals for display in UI.

## Tracked Fields

```
name, description, mainImageUrl,
imageUrls, phone, email,
location.country, location.city, location.addressLine, location.lat, location.lon,
workingSchedule, timezone
```

All comparisons use canonical form, so formatting differences (e.g. whitespace, image order, float precision) do not trigger proposals.

## Persistence Schema

- `crm_salon_last_hash` — baseline hash per field (seeded on first pull).
- `crm_salon_change_proposal` — pending/accepted/dismissed proposals with old/new JSON.
- `crm_salon_snapshot` — optional payload archive for debugging.

## Usage Entry Points

- Internal sync controller (`POST /api/v1/internal/salons/sync` / `:id/images/sync`) forwards CRM payloads here instead of mutating salons directly.
- `CrmIntegrationService.pullSalonAndDetectChanges` wraps CRM adapter pulls and immediately feeds the result into detection.
- Authenticated API (`GET/POST /api/v1/crm/salon/changes/...`) exposes proposals for acceptance.

## Testing

`test/crm-salon-changes/crm-salon-diff.service.spec.ts` covers:
- No-op when hashes match and snapshot is unchanged.
- Proposal creation when CRM diverges from the previous snapshot.
- Silent baseline seeding on first pull.
- Accept/dismiss flows and image updates.

Run the focused suite:

```bash
npm test -- --runTestsByPath test/crm-salon-changes/crm-salon-diff.service.spec.ts
```
