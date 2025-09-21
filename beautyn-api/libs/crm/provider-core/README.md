# Provider Core

Typed façade for CRM providers (Altegio, EasyWeek). No HTTP here yet—these are **stubs** with clean interfaces.

## Responsibilities
- Standardize method names & payloads.
- Centralize access to Token Storage & Account Registry.
- Expose a Nest `ProviderFactory` to get a provider instance for a given `CrmType`.

## Providers
- **Altegio**: uses `AccountRegistry` for `externalSalonId`. Service tokens come from `TokenStorage` as a dual bundle `{ accessToken, userToken }`.
- **EasyWeek**: uses `TokenStorage` for `{ apiKey }` and `AccountRegistry` for `{ workspaceSlug, locationId }`.

> Actual HTTP calls will be added later. For now, methods log + throw `CrmError('Not implemented', INTERNAL)`.
