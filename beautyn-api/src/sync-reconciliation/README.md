# Sync Reconciliation

This module keeps the Application (APP) state and external CRM state consistent using an Outbox + Worker pipeline and a deterministic merge policy.

## Goals
- Durable delivery of APP intents to CRM (create/update/delete/schedule) with retries
- Maintain mappings between internal IDs and vendor external IDs
- Track the last known remote snapshot ("shadow store") to compute diffs reliably
- Resolve conflicts based on a per-field Source of Truth policy (APP/CRM/AUTO)

## High-level flow
1. Application produces an intent (e.g., create service) and enqueues it via OutboxService.
2. The intent is persisted in the outbox repo and scheduled as a BullMQ job.
3. The Outbox Worker consumes the job, resolves IDs/mappings, and calls `CrmAdapterService` to invoke a vendor provider.
4. On success, the worker updates mappings (for create), optionally updates the shadow snapshot, and marks the intent delivered. On failure, it records the error and schedules a retry with backoff.

## Components
- OutboxService (`outbox.service.ts`)
  - Persists intents and queues BullMQ jobs (`crm-outbox`).
  - Job id equals intent id for idempotence.

- Outbox Worker (`outbox.processor.ts`)
  - BullMQ `Worker` consuming jobs from `crm-outbox`.
  - Loads the intent row, marks it running, executes vendor call via `CrmAdapterService`, and marks delivered or error with next run time.
  - Uses `executeWithRetry` for transient failures.

- MappingRepository (`mapping.repository.ts`)
  - Stores internal↔external IDs per entity type and provider.
  - Updated on successful create (the provider returns external id).

- ShadowStore (`shadow-store.repository.ts`, `shadow-store.service.ts`)
  - Persists the last known remote snapshot per entity/provider to compute diffs and detect divergence.

- MergePolicyService (`merge-policy.service.ts`)
  - Returns field-level SoT policy per salon (`APP`, `CRM`, or `AUTO` → latest-wins fallback).

- ConflictResolverService (`conflict-resolver.service.ts`)
  - Given local and remote shapes (plus optional timestamps), produces either a push patch (APP→CRM), a pull patch (CRM→APP), or `noop`.
  - Example implementation provided for Services; extend similarly for other entities.

- Types (`types.ts`)
  - Intent operations: `create | update | delete | updateSchedule`.
  - Intent lifecycle: `pending | running | delivered | error | conflict`.
  - Shadow snapshot shape including vendor version/updatedAt.

## Configuration
- Requires `REDIS_URL` for BullMQ connection.
- Queue name for outbox jobs: `crm-outbox`.

## Starting the worker
The module exports utilities/services. To run the worker you must wire concrete repositories and call `startOutboxWorker`.

```ts
import { startOutboxWorker } from './outbox.processor';
import { CrmAdapterService } from '@crm/adapter';

// Provide concrete implementations for these interfaces
import { OutboxRepositoryImpl } from './infra/outbox.repo.impl';
import { MappingRepositoryImpl } from './infra/mapping.repo.impl';

const worker = startOutboxWorker({
  repo: new OutboxRepositoryImpl(),
  mapper: new MappingRepositoryImpl(),
  adapter: new CrmAdapterService(/* via Nest DI in app context */),
});
```

Note: in the application, you would normally create the worker inside a bootstrap script with proper Nest DI to obtain `CrmAdapterService` and repo implementations.

## Enqueueing intents
```ts
await outboxService.enqueue({
  salonId,
  entityType: 'service',
  entityId: serviceId,
  provider: providerType,
  op: 'create',
  payload: {
    name,
    durationMin,
    priceMinor,
    currency,
    categoryExternalId,
  },
  idempotencyKey: `service:create:${serviceId}:${providerType}`,
  requestId,
});
```

## Delivery logic
Inside `outbox.processor.ts` the operation switch demonstrates how each intent should be delivered via the adapter and how to maintain mappings for newly created entities. It also shows status transitions and exponential backoff on failure. If commented, un-comment to activate delivery.

- Create:
  - Call `adapter.create{Entity}` → receive `externalId` → `MappingRepository.setExternalId` → `markDelivered`.
- Update:
  - Resolve `externalId` (if needed) → call `adapter.update{Entity}` → `markDelivered`.
- Delete:
  - Resolve `externalId` → call `adapter.delete{Entity}` → delete mapping → `markDelivered`.
- Update schedule:
  - Resolve worker `externalId` → call `adapter.updateWorkerSchedule` → `markDelivered`.

On error:
- Increment attempts, compute next run time with capped exponential backoff, `markError` with `nextRunAt`.

## Reconciliation (pull + policy)
During syncs (e.g., via `@crm/sync-scheduler` and adapter pull methods), fetch remote entities, compare with shadow snapshots, and use `ConflictResolverService` with `MergePolicyService` to decide changes:
- `push` patch → enqueue an update intent for CRM
- `pull` patch → apply change in APP (and update shadow)
- `noop` → nothing

## Extending
- Add new entity operations: extend `EntityType`, `IntentOp` if needed, add adapter methods, and expand the worker switch and mapping logic.
- Implement concrete repositories for Outbox, Mapping, and ShadowStore (e.g., using Prisma).
- Add conflict resolution functions for new entities following the Service example.

## Observability
- Logs are written via `@shared/logger` with request-scoped context set by the worker. Consider exporting metrics (queue depth, processing latency, attempts, failure rate).

## Current status
- The worker contains the delivery switch and status updates as a commented reference. Enable it and provide repository implementations to make the pipeline live.


