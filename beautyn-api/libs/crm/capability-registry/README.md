# Capability Registry

A tiny NestJS-friendly library that provides a typed capability registry for CRM providers. It loads defaults from a JSON file and optionally deep‑merges an override JSON when the `CRM_CAPS_PATH` env var is set and points to an existing file.

## Environment

- `CRM_CAPS_PATH` (optional): absolute or relative path to a JSON file with capability overrides. Overrides are deep‑merged per provider key.

## Example

```ts
import { CapabilityRegistryService } from '@crm/capability-registry';
import { CrmType } from '@crm/shared';

const caps = new CapabilityRegistryService();

// Get typed capabilities for a provider
const altegio = caps.get(CrmType.ALTEGIO);

// Assert a capability
caps.assert(CrmType.ALTEGIO, 'supportsBooking');

// Check a capability
if (caps.has(CrmType.EASYWEEK, 'webhooks')) {
  // subscribe to events
}

// List all providers present in the registry
const providers = caps.list();
```

