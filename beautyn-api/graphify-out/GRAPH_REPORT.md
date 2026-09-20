# Graph Report - beautyn-api  (2026-09-20)

## Corpus Check
- 578 files · ~169,498 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 2, .toml 2, .example 1)

## Summary
- 3824 nodes · 9713 edges · 201 communities (184 shown, 17 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 458 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4228e638`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- scripts
- PrismaService
- main.ts
- CategoriesAuthenticatedController
- app.module.ts
- sync-reconciliation/types.ts
- CRM Integration Layer
- crm-integration.service.ts
- CategoriesService
- UpsertWorkerDto
- auth.service.ts
- CrmType
- user.service.ts
- OnboardingController
- BookingHandlerService
- salon-category-mappings.service.ts
- ErrorKind
- altegio/bookings.ts
- seed-local.ts
- dtos.ts
- home-feed.service.ts
- 4. Internal Architecture
- test-app.workers.ts
- AuthPublicController
- .changePassword
- altegio-booking.service.ts
- client-identity.ts
- booking-handler.service.ts
- HomeFeedSectionFiltersDto
- sync-scheduler/src/index.ts
- SearchRequestDto
- BrandController
- SalonsInternalController
- BookingQueryService
- shared/src/index.ts
- SearchService
- AltegioConfirmDto
- @nestjs/common
- AuthService
- ServicesAuthenticatedController
- ServicesService
- WorkersAuthenticatedController
- compilerOptions
- onboarding.controller.ts
- SearchAuthenticatedController
- PhoneVerificationService
- Page
- .uploadImage
- .get
- crm-salon-diff.service.ts
- Operations
- CRM Integration — EasyWeek Sync API (Beautyn)
- AppCategoriesService
- .handleEasyweekBooking
- paths
- public-api.module.ts
- provider-core/src/index.ts
- fakes.prisma.workers.ts
- createChildLogger
- OwnerBookingsController
- HomeFeedSectionsAdminController
- CreateHomeFeedSectionDto
- ServicesListQuery
- WorkersListQuery
- crm-integration.module.ts
- .getHomeFeed
- .searchPins
- UpdateUserDto
- crm-internal.module.ts
- ClientBookingsController
- booking-flow.ts
- .confirm
- StorageService
- SalonClientsRepository
- CategoriesSyncDto
- AltegioBookingService
- booking.response.dto.ts
- sync.internal.controller.ts
- .list
- user-settings.service.ts
- .list
- SendOtpDto
- shared.module.ts
- capability-registry.service.ts
- easyweek-booking.service.ts
- auth.public.controller.ts
- .upsertMapping
- CreateCategoryDto
- @nestjs/swagger
- WorkerDto
- WorkersService
- .create
- BookingDto
- AltegioBookingPublicController
- AuthResetController
- crm-providers.registry.ts
- ServicesRepository
- WorkersRepository
- executeWithRetry
- app-categories.service.ts
- SalonService
- services.service.ts
- CreateAltegioRecordDto
- initialSync.processor.ts
- SalonsAuthenticatedController
- HomeFeedSectionConfigService
- CreateAppCategoryDto
- CreateServiceDto
- UpdateServiceDto
- dependencies
- CRM Workers & Sync
- Phone Number Validation
- OAuthSignInDto
- AccountRegistryService
- SalonClientsController
- brand.controller.ts
- GetTimeSlotsDto
- GetBookableWorkersDto
- Key Features
- OwnerServicesListQueryDto
- WorkersController
- devDependencies
- Sync Reconciliation
- FinalizeEasyWeekDto
- GetBookableDatesDto
- GetBookableServicesDto
- SalonListQuery
- Beautyn API — Architecture & Features
- nest-cli.json
- tsconfig.build.json
- CrmSyncOrchestratorService
- SubmitSalonFromCrmDto
- crm-internal.controller.ts
- package.json
- SalonSyncDto
- Beautyn API (B2B2C salon marketplace backend)
- BookingsInternalController
- salons.internal.controller.ts
- README.md
- The 7 BullMQ sync workers (one process per queue)
- CategoriesRepository
- OnboardingService
- onboarding.service.ts
- salon-clients.service.ts
- salons.controller.ts
- .sync
- SharedModule
- CRM Salon Change Detection
- BrandSalonResponseDto
- Development
- AltegioLinkDto
- ConnectEasyWeekDto
- EasyWeekLinkDto
- SearchHistory
- UserOwnershipGuard
- CRM Retry Handler
- outbox.processor.ts
- SalonClientLinker
- JestSummaryReporter
- OwnerBookingsListQueryDto
- OwnerClientsListQueryDto
- SyncSchedulerService
- user.entity.ts
- create-test-app.ts
- CapabilityRegistryService (typed provider capability flags, CRM_CAPS_PATH overrides)
- EasyWeek widget booking confirmation (MVP)
- Token Storage (AES-256-GCM)
- Outbox Worker (outbox.processor.ts, consumes crm-outbox)
- .list
- Salon clients
- VerifyOtpDto
- categories.module.ts
- pagination.util.ts
- skip-response-transform.decorator.ts
- WellKnownController
- CrmSalonPreviewRequestDto
- .create
- authenticated-api.module.ts
- workers.md
- Account Registry (non-secret CRM config)
- Capability Registry
- Provider Core
- Shared Logger
- SalonImageSyncItemDto
- CRM Adapter
- CLAUDE.md
- shared/README.md
- RegisterDto
- onboarding.module.ts
- ListQueryDto
- SalonClientsService
- ServicesSyncDto
- UpdateCategoryDto
- CorsCheckController
- RefreshTokenDto
- salons.e2e-spec.ts
- SavedSalonsService
- brand.entity.ts
- brand-member.entity.ts
- eslint.config.mjs

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 205 edges
2. `@nestjs/swagger` - 157 edges
3. `CrmType` - 108 edges
4. `PrismaService` - 94 edges
5. `scripts` - 88 edges
6. `CrmIntegrationService` - 73 edges
7. `class-validator` - 68 edges
8. `@prisma/client` - 65 edges
9. `BookingHandlerService` - 59 edges
10. `JwtAuthGuard` - 47 edges

## Surprising Connections (you probably didn't know these)
- `Owner endpoints` --references--> `SalonAccessGuard`  [INFERRED]
  docs/salon-clients.md → src/brand/guards/salon-access.guard.ts
- `The 7 BullMQ sync workers (one process per queue)` --shares_data_with--> `Local Redis service (redis:7-alpine, port 6380)`  [INFERRED]
  docs/workers.md → docker-compose.yml
- `AltegioBookingPayload` --implements--> `AltegioBooking`  [EXTRACTED]
  src/booking/dto/bookings-sync.dto.ts → libs/crm/provider-core/src/altegio/bookings.ts
- `AltegioBookingsSyncDto` --references--> `AltegioBooking`  [EXTRACTED]
  src/booking/dto/bookings-sync.dto.ts → libs/crm/provider-core/src/altegio/bookings.ts
- `SalonInternalSyncDto` --references--> `SalonData`  [EXTRACTED]
  src/salon/dto/salon-internal-sync.dto.ts → libs/crm/provider-core/src/dtos.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CRM Integration Stack (Adapter -> Provider Core -> Retry/Token/Capability/Account/Scheduler)** — libs_crm_adapter_readme_crmadapter, libs_crm_provider_core_readme_providercore, libs_crm_capability_registry_readme_capabilityregistryservice, libs_crm_retry_handler_readme_executewithretry, libs_crm_token_storage_readme_tokenstorageservice, libs_crm_account_registry_readme_accountregistry, libs_crm_sync_scheduler_readme_syncscheduler [EXTRACTED 1.00]
- **Outbox Delivery Pipeline (durable APP->CRM reconciliation)** — src_sync_reconciliation_readme_outboxservice, src_sync_reconciliation_readme_outboxprocessor, src_sync_reconciliation_readme_mappingrepository, src_sync_reconciliation_readme_shadowstore, src_sync_reconciliation_readme_mergepolicyservice, src_sync_reconciliation_readme_conflictresolverservice [EXTRACTED 1.00]
- **Two-Lane Bookings Poller Flow (cron tick -> dispatch -> per-salon rebase)** — docs_workers_cron_worker, docs_workers_internal_sync_api, docs_workers_bookings_worker, docs_workers_two_lane_bookings_poller, libs_crm_sync_scheduler_readme_syncscheduler [EXTRACTED 1.00]

## Communities (201 total, 17 thin omitted)

### Community 0 - "scripts"
Cohesion: 0.02
Nodes (88): scripts, backfill:client:dev, backfill:client:local, backfill:client:prod, backfill:client:stage, backfill:clients:dev, backfill:clients:local, backfill:clients:prod (+80 more)

### Community 1 - "PrismaService"
Cohesion: 0.08
Nodes (18): libs_crm_capability_registry_src_index_capability, libs_crm_shared_src_index_uuidv5fromstrings, @prisma/client, UpsertMappingInput, BrandWithCount, UpsertInput, OwnerNotificationPatch, SalonMapper (+10 more)

### Community 2 - "main.ts"
Cohesion: 0.06
Nodes (35): @nestjs/config, SyncBookingsJobResponseDto, SyncBookingsNowResponseDto, ApiProperty, SyncSalonJobResponseDto, ApiProperty, MessageResponseDto, ApiProperty (+27 more)

### Community 3 - "CategoriesAuthenticatedController"
Cohesion: 0.17
Nodes (19): CategoriesAuthenticatedController, ApiAcceptedResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation (+11 more)

### Community 4 - "app.module.ts"
Cohesion: 0.08
Nodes (40): libs_crm_token_storage_src_index_token_storage_repository, libs_shared_logger_src_index_loggerinterceptor, libs_shared_logger_src_index_loggermodule, ref_crypto, @nestjs/core, @nestjs/testing, rxjs, @supabase/supabase-js (+32 more)

### Community 5 - "sync-reconciliation/types.ts"
Cohesion: 0.07
Nodes (24): ConflictResolverService, Decision, Injectable, DEFAULT_POLICY, MergePolicyService, Injectable, clampDuration(), normalizeName() (+16 more)

### Community 6 - "CRM Integration Layer"
Cohesion: 0.26
Nodes (16): CRM Integration Layer, Onboarding Flow (CRM connect -> brand -> subscription), Altegio CRM Integration (sync API reference), Altegio booking-create idempotency (dedupe by client/datetime/staff/services), Altegio dual-token auth (Bearer + User headers), EasyWeek booking-create idempotency (dedupe by phone/reserved_on/service), EasyWeek CRM Integration (sync API reference), EasyWeek widget booking confirmation (POST /bookings/easyweek/confirm) (+8 more)

### Community 7 - "crm-integration.service.ts"
Cohesion: 0.09
Nodes (38): libs_crm_account_registry_src_index_accountregistryservice, Op, BookingData, CategoryData, WorkerSchedule, libs_crm_provider_core_src_index_altegiocreaterecordpayload, libs_crm_provider_core_src_index_altegioprovider, libs_crm_provider_core_src_index_bookingdata (+30 more)

### Community 8 - "CategoriesService"
Cohesion: 0.23
Nodes (7): CategoriesService, Injectable, CategoryListResponseDto, CategoryResponseDto, ApiProperty, normalizeHexColor(), toCategoryResponse()

### Community 9 - "UpsertWorkerDto"
Cohesion: 0.25
Nodes (7): ApiProperty, IsBoolean, IsNotEmpty, IsOptional, IsString, Length, UpsertWorkerDto

### Community 10 - "auth.service.ts"
Cohesion: 0.08
Nodes (29): CheckEmailDto, ApiProperty, IsEmail, FORGOT_PASSWORD_CLIENTS, ForgotPasswordClient, ForgotPasswordDto, ApiProperty, ApiPropertyOptional (+21 more)

### Community 11 - "CrmType"
Cohesion: 0.09
Nodes (8): CrmAdapterService, Injectable, Capability, CrmType, ALTEGIO, EASYWEEK, CrmIntegrationService, Injectable

### Community 12 - "user.service.ts"
Cohesion: 0.09
Nodes (17): NotificationUserDto, ApiProperty, Expose, ApiProperty, ApiPropertyOptional, Expose, UserResponseDto, TransformUserResponseInterceptor (+9 more)

### Community 13 - "OnboardingController"
Cohesion: 0.18
Nodes (17): OnboardingController, ApiAcceptedResponse, ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags (+9 more)

### Community 15 - "salon-category-mappings.service.ts"
Cohesion: 0.13
Nodes (13): SalonAppCategoryMappingDto, SalonCategoryMappingResponseDto, ApiProperty, ApiProperty, IsBoolean, IsOptional, IsUUID, UpdateSalonCategoryMappingDto (+5 more)

### Community 16 - "ErrorKind"
Cohesion: 0.18
Nodes (9): isRetryable(), ErrorKind, AUTH, INTERNAL, NETWORK, NOT_SUPPORTED, RATE_LIMIT, VALIDATION (+1 more)

### Community 17 - "altegio/bookings.ts"
Cohesion: 0.11
Nodes (15): fetchBooking(), listRecords(), mapRecord(), pullBookings(), wait(), AltegioContext, AltegioHttp, createWorker() (+7 more)

### Community 18 - "seed-local.ts"
Cohesion: 0.07
Nodes (41): RFC-4122, uuidV5FromStrings(), ref_node_crypto, prisma, APP_CATEGORIES, HOME_FEED_SECTIONS, SALON_NAMES, SEARCH_SEED_PREFIX (+33 more)

### Community 19 - "dtos.ts"
Cohesion: 0.08
Nodes (26): Day, DAY_NAME, dayHours(), formatWorkingDay(), formatWorkingSchedule(), Hhmm, SalonData, toDotHhmm() (+18 more)

### Community 20 - "home-feed.service.ts"
Cohesion: 0.10
Nodes (24): HomeFeedNextBookingDto, HomeFeedNextBookingServiceDto, ApiProperty, ApiPropertyOptional, HomeFeedResponseDto, ApiProperty, ApiPropertyOptional, HomeFeedSalonCardDto (+16 more)

### Community 21 - "4. Internal Architecture"
Cohesion: 0.05
Nodes (38): 1. Purpose, 2. Responsibilities, 3.1.1 LocationType, 3.1.2 SearchRequestDto, 3.1.3 SearchResponseDto, 3.1.4 SearchSuggestionDto (removed), 3.1.5 SearchHistoryItemDto, 3.1 Types & DTOs (+30 more)

### Community 22 - "test-app.workers.ts"
Cohesion: 0.10
Nodes (17): ServicesInternalController, ApiExcludeController, Controller, ApiExcludeController, ApiExcludeEndpoint, Body, Controller, HttpCode (+9 more)

### Community 23 - "AuthPublicController"
Cohesion: 0.23
Nodes (19): ApiForbiddenResponse, AuthPublicController, ApiAcceptedResponse, ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse (+11 more)

### Community 24 - ".changePassword"
Cohesion: 0.09
Nodes (26): ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse (+18 more)

### Community 25 - "altegio-booking.service.ts"
Cohesion: 0.15
Nodes (21): SalonContext, BookableDatesResponseDto, ApiProperty, BookableServiceCategoryDto, BookableServiceDto, BookableServicesResponseDto, ApiProperty, BookableWorkerDto (+13 more)

### Community 26 - "client-identity.ts"
Cohesion: 0.12
Nodes (29): Counts, loadAccount(), main(), clientFromRow(), normalizeEmail(), AccountLike, altegioClientExternalId(), AltegioClientLike (+21 more)

### Community 27 - "booking-handler.service.ts"
Cohesion: 0.14
Nodes (18): Counts, deriveSnapshot(), main(), readEasyweekCustomer(), AccountRow, NormalizedEasyweek, BOOKING_CANCELLED_STATUSES, cleanName() (+10 more)

### Community 28 - "HomeFeedSectionFiltersDto"
Cohesion: 0.18
Nodes (11): HomeFeedSectionFiltersDto, ApiPropertyOptional, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID (+3 more)

### Community 29 - "sync-scheduler/src/index.ts"
Cohesion: 0.15
Nodes (19): libs_crm_retry_handler_src_index_executewithretry, libs_crm_sync_scheduler_src_index_sync_queue, BullQueueLike, BOOKINGS_QUEUE, CATEGORIES_QUEUE, CRON_DIFF_QUEUE, CronDiffJob, CronDiffJobWithSchedule (+11 more)

### Community 30 - "SearchRequestDto"
Cohesion: 0.07
Nodes (35): FilterOptionsResultDto, ApiProperty, SearchRequestDto, SearchViewportDto, ApiPropertyOptional, IsArray, IsEnum, IsNumber (+27 more)

### Community 31 - "BrandController"
Cohesion: 0.14
Nodes (21): Put, BrandController, ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery (+13 more)

### Community 32 - "SalonsInternalController"
Cohesion: 0.18
Nodes (12): SalonsInternalController, ApiExcludeController, Body, Controller, HttpCode, Param, Post, UseGuards (+4 more)

### Community 33 - "BookingQueryService"
Cohesion: 0.15
Nodes (7): BookingQueryService, BookingWithRelations, Injectable, BookingListResponseDto, BookingProviderAltegioDto, BookingProviderEasyweekDto, findMany()

### Community 34 - "shared/src/index.ts"
Cohesion: 0.09
Nodes (18): AccountRegistryModule, Module, libs_crm_account_registry_src_index_accountregistrymodule, libs_crm_account_registry_src_index_accountregistryrepository, PrismaAccountRegistryRepository, Injectable, AccountRegistryRepository, ACCOUNT_REGISTRY_REPOSITORY (+10 more)

### Community 35 - "SearchService"
Cohesion: 0.13
Nodes (11): SearchPinDto, SearchPinsResultDto, SearchResponseDto, SearchResultDto, SearchResultMetaDto, ApiProperty, ApiPropertyOptional, GeoLocationService (+3 more)

### Community 36 - "AltegioConfirmDto"
Cohesion: 0.11
Nodes (16): Res, AltegioWebhookController, ApiExcludeController, Body, Controller, Get, Post, Query (+8 more)

### Community 37 - "@nestjs/common"
Cohesion: 0.17
Nodes (19): ref_express, @nestjs/common, @nestjs/platform-express, MIME_TO_EXT, SalonAccessGuard, Injectable, CrmSalonChangeDto, ApiProperty (+11 more)

### Community 38 - "AuthService"
Cohesion: 0.12
Nodes (5): AuthService, Injectable, CheckEmailResponseDto, EmailStatus, ApiProperty

### Community 39 - "ServicesAuthenticatedController"
Cohesion: 0.17
Nodes (19): ServicesAuthenticatedController, ApiAcceptedResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation (+11 more)

### Community 40 - "ServicesService"
Cohesion: 0.18
Nodes (5): ServiceResponseDto, ApiProperty, ServiceRecord, ServicesService, Injectable

### Community 41 - "WorkersAuthenticatedController"
Cohesion: 0.19
Nodes (18): ApiAcceptedResponse, ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, Body (+10 more)

### Community 42 - "compilerOptions"
Cohesion: 0.08
Nodes (24): ./tsconfig.base.json, compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+16 more)

### Community 43 - "onboarding.controller.ts"
Cohesion: 0.14
Nodes (16): AltegioPairCodeResponseDto, ApiProperty, CrmFieldDto, CrmProviderDto, CrmProviderLinksDto, ApiProperty, CrmProviderListResponseDto, ApiProperty (+8 more)

### Community 44 - "SearchAuthenticatedController"
Cohesion: 0.13
Nodes (14): SearchAuthenticatedController, ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Delete (+6 more)

### Community 45 - "PhoneVerificationService"
Cohesion: 0.13
Nodes (10): twilio, PhoneVerificationService, Inject, Injectable, Optional, VerificationSession, MockSmsProvider, SMS_PROVIDER (+2 more)

### Community 46 - "Page"
Cohesion: 0.06
Nodes (11): AltegioBooking, ListRecordsParams, AltegioProvider, notImplemented(), Page, ServiceData, WorkerData, EasyWeekBooking (+3 more)

### Community 47 - ".uploadImage"
Cohesion: 0.16
Nodes (18): AppCategoriesController, ApiBearerAuth, ApiConsumes, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags (+10 more)

### Community 48 - ".get"
Cohesion: 0.14
Nodes (15): SalonsController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, Controller (+7 more)

### Community 49 - "crm-salon-diff.service.ts"
Cohesion: 0.10
Nodes (20): applyFieldPatch(), buildLocalSnapshot(), CrmSalonDiffService, LocalSalonSnapshot, PendingOperation, toPrismaJson(), TRACKED_FIELDS, TrackedField (+12 more)

### Community 50 - "Operations"
Cohesion: 0.07
Nodes (26): 10) Staff — Update, 11) Staff Schedule — Get (read‑only), 12) Records (Bookings) — Create, 13) Records (Bookings) — Update (reschedule/comment), 14) Records (Bookings) — Delete, 15) Records (Bookings) — List (by client, with_deleted), 1) Companies / Salon Profile — List Companies, 2) Companies / Salon Profile — Get Company (canonical) (+18 more)

### Community 51 - "CRM Integration — EasyWeek Sync API (Beautyn)"
Cohesion: 0.09
Nodes (21): 10) Booking — Cancel, 1) Workspace, 2) Locations (Salons), 3) Service Categories, 4) Services, 5) Staff (Workers), 6) Accounts (for completion payments), 7) Availability (+13 more)

### Community 52 - "AppCategoriesService"
Cohesion: 0.10
Nodes (13): AppCategoriesService, Injectable, ApiProperty, IsArray, IsBoolean, IsOptional, IsString, Length (+5 more)

### Community 54 - "paths"
Cohesion: 0.15
Nodes (12): compilerOptions, baseUrl, paths, @crm/account-registry, @crm/adapter, @crm/capability-registry, @crm/provider-core, @crm/retry-handler (+4 more)

### Community 55 - "public-api.module.ts"
Cohesion: 0.16
Nodes (11): HealthController, Controller, Get, AuthModule, Module, PhoneVerificationModule, Module, SyncTriggerService (+3 more)

### Community 56 - "provider-core/src/index.ts"
Cohesion: 0.11
Nodes (27): libs_crm_provider_core_src_index_providercoremodule, libs_crm_provider_core_src_index_providerfactory, ProviderCoreModule, Module, ProviderFactory, Injectable, libs_crm_sync_scheduler_src_index_startbookingssyncworker, libs_crm_sync_scheduler_src_index_startcategoriessyncworker (+19 more)

### Community 57 - "fakes.prisma.workers.ts"
Cohesion: 0.11
Nodes (10): count(), createFakePrismaForWorkers(), FakePrismaWorkersApi, findFirst(), ServiceRecord, TextContains, WorkerCreateData, WorkerEntity (+2 more)

### Community 58 - "createChildLogger"
Cohesion: 0.08
Nodes (21): als, getRequestId(), RequestContext, libs_shared_logger_src_index_createchildlogger, libs_shared_logger_src_index_getrequestid, libs_shared_logger_src_index_requestcorrelationmiddleware, LoggerInterceptor, Injectable (+13 more)

### Community 59 - "OwnerBookingsController"
Cohesion: 0.19
Nodes (12): OwnerBookingsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller, Get (+4 more)

### Community 60 - "HomeFeedSectionsAdminController"
Cohesion: 0.16
Nodes (13): HomeFeedSectionsAdminController, ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Delete (+5 more)

### Community 61 - "CreateHomeFeedSectionDto"
Cohesion: 0.15
Nodes (13): CreateHomeFeedSectionDto, ApiProperty, ApiPropertyOptional, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString (+5 more)

### Community 62 - "ServicesListQuery"
Cohesion: 0.10
Nodes (17): ServicesController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Query (+9 more)

### Community 63 - "WorkersListQuery"
Cohesion: 0.14
Nodes (9): ApiProperty, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min, Type (+1 more)

### Community 64 - "crm-integration.module.ts"
Cohesion: 0.22
Nodes (12): InternalApiModule, Module, AltegioBookingModule, Module, BookingModule, Module, EasyweekBookingModule, Module (+4 more)

### Community 65 - ".getHomeFeed"
Cohesion: 0.11
Nodes (16): HomeFeedController, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Query, Req (+8 more)

### Community 66 - ".searchPins"
Cohesion: 0.18
Nodes (12): SearchPublicController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, Body, Controller, Get (+4 more)

### Community 67 - "UpdateUserDto"
Cohesion: 0.13
Nodes (17): libphonenumber-js, ALLOWED_AVATAR_DOMAINS, IsAllowedAvatarDomain(), TestDto, INTERNATIONAL_PREFIX, IsValidPhone(), PHONE_VALIDATOR_NAME, TestDto (+9 more)

### Community 68 - "crm-internal.module.ts"
Cohesion: 0.18
Nodes (9): CrmAdapterModule, Module, libs_crm_adapter_src_index_crmadaptermodule, CrmInternalController, ApiExcludeController, Controller, UseGuards, CrmInternalModule (+1 more)

### Community 69 - "ClientBookingsController"
Cohesion: 0.18
Nodes (12): ClientBookingsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Param (+4 more)

### Community 70 - "booking-flow.ts"
Cohesion: 0.12
Nodes (11): AltegioBookCategory, AltegioBookDatesResponse, AltegioBookService, AltegioBookServicesResponse, AltegioBookStaff, AltegioBookStaffResponse, AltegioBookTime, AltegioBookTimesResponse (+3 more)

### Community 71 - ".confirm"
Cohesion: 0.12
Nodes (14): EasyweekBookingAuthenticatedController, ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller (+6 more)

### Community 72 - "StorageService"
Cohesion: 0.11
Nodes (16): StorageController, ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags, Controller, Delete (+8 more)

### Community 73 - "SalonClientsRepository"
Cohesion: 0.19
Nodes (7): SalonClientSort, BOOKINGS_DESC, LAST_VISIT_DESC, NAME_ASC, NAME_DESC, SalonClientsRepository, Injectable

### Community 74 - "CategoriesSyncDto"
Cohesion: 0.25
Nodes (9): CategoriesSyncDto, CategorySyncItemDto, ApiProperty, IsInt, IsNotEmpty, IsOptional, IsString, Type (+1 more)

### Community 75 - "AltegioBookingService"
Cohesion: 0.33
Nodes (3): AltegioBookingService, Injectable, mapTimeSlots()

### Community 76 - "booking.response.dto.ts"
Cohesion: 0.27
Nodes (13): BookingClientDto, BookingClientResponseDto, BookingHistoryEntryDto, BookingListResponseDtoClass, BookingProviderAltegioResponseDto, BookingProviderEasyweekResponseDto, BookingProviderSpecificDto, BookingResponseDto (+5 more)

### Community 77 - "sync.internal.controller.ts"
Cohesion: 0.16
Nodes (10): SyncInternalController, ApiExcludeController, Body, Controller, HttpCode, Post, UseGuards, SyncDispatchDto (+2 more)

### Community 78 - ".list"
Cohesion: 0.20
Nodes (8): CategoriesPublicController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Query

### Community 79 - "user-settings.service.ts"
Cohesion: 0.05
Nodes (37): ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, Body, Controller (+29 more)

### Community 80 - ".list"
Cohesion: 0.17
Nodes (13): ApiBadRequestResponse, ApiOkResponse, ApiOperation, Get, Param, Post, Query, Req (+5 more)

### Community 81 - "SendOtpDto"
Cohesion: 0.40
Nodes (5): SendOtpDto, ApiProperty, IsString, Matches, Transform

### Community 82 - "shared.module.ts"
Cohesion: 0.15
Nodes (7): Catch, argon2, EnvelopeExceptionFilter, AppConfigService, Injectable, HashService, Injectable

### Community 83 - "capability-registry.service.ts"
Cohesion: 0.20
Nodes (11): CapabilityRegistryService, deepMerge(), isRecord(), loadDefaultMapWithCandidates(), loadJson(), loadOverride(), Injectable, libs_crm_capability_registry_src_index_capabilityregistryservice (+3 more)

### Community 84 - "easyweek-booking.service.ts"
Cohesion: 0.12
Nodes (19): BookingsRebaseDto, ApiProperty, ApiPropertyOptional, IsIn, IsOptional, IsUUID, AltegioBookingPayload, AltegioBookingsSyncDto (+11 more)

### Community 85 - "auth.public.controller.ts"
Cohesion: 0.11
Nodes (13): @nestjs/throttler, LoginResponseDto, ApiProperty, OAuthResponseDto, ApiProperty, RegisterResponseDto, ApiProperty, ResetPasswordResponseDto (+5 more)

### Community 86 - ".upsertMapping"
Cohesion: 0.27
Nodes (11): AppCategoryMappingsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller, Get (+3 more)

### Community 87 - "CreateCategoryDto"
Cohesion: 0.25
Nodes (8): CreateCategoryDto, ApiProperty, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Length

### Community 88 - "@nestjs/swagger"
Cohesion: 0.07
Nodes (15): class-transformer, class-validator, @nestjs/swagger, ClientNotificationSettingsDto, ApiProperty, Expose, UpdateHomeFeedSectionDto, CrmLinkedDto (+7 more)

### Community 89 - "WorkerDto"
Cohesion: 0.38
Nodes (7): ApiProperty, WorkerDto, ApiProperty, WorkersListResponseDto, ApiProperty, WorkersSyncJobResponseDto, WorkersSyncResultDto

### Community 90 - "WorkersService"
Cohesion: 0.19
Nodes (3): WorkerEntityInput, Injectable, WorkersService

### Community 91 - ".create"
Cohesion: 0.14
Nodes (12): AltegioBookingAuthenticatedController, ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller (+4 more)

### Community 92 - "BookingDto"
Cohesion: 0.32
Nodes (4): Lane, BookingSyncService, Injectable, BookingDto

### Community 93 - "AltegioBookingPublicController"
Cohesion: 0.34
Nodes (9): AltegioBookingPublicController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Param (+1 more)

### Community 94 - "AuthResetController"
Cohesion: 0.40
Nodes (4): AuthResetController, Controller, Get, Header

### Community 95 - "crm-providers.registry.ts"
Cohesion: 0.18
Nodes (9): altegioLinks(), CrmCode, CrmDescriptor, CrmField, CrmFieldType, CrmFlow, CrmProviderLinks, CrmProvidersRegistry (+1 more)

### Community 97 - "WorkersRepository"
Cohesion: 0.15
Nodes (4): Injectable, WorkersCategory, Injectable, WorkersRepository

### Community 98 - "executeWithRetry"
Cohesion: 0.12
Nodes (18): applyJitter(), calcDelay(), clamp(), sleep(), BreakerOpenError, CircuitBreaker, envBool(), envInt() (+10 more)

### Community 99 - "app-categories.service.ts"
Cohesion: 0.14
Nodes (16): MIME_TO_EXT, AppCategoryListResponseDto, ApiProperty, AppCategoryResponseDto, ApiProperty, APP_CATEGORY_MAX_LIMIT, ListAppCategoriesQueryDto, ApiProperty (+8 more)

### Community 100 - "SalonService"
Cohesion: 0.21
Nodes (6): SalonDto, ApiProperty, Expose, SalonIncludeOptions, SalonService, Injectable

### Community 101 - "services.service.ts"
Cohesion: 0.17
Nodes (14): ServiceDto, ApiProperty, Expose, ServicesListResponseDto, ApiProperty, Expose, Type, ServicesSyncJobResponseDto (+6 more)

### Community 102 - "CreateAltegioRecordDto"
Cohesion: 0.18
Nodes (11): ArrayMaxSize, ArrayMinSize, CreateAltegioRecordDto, ApiProperty, ApiPropertyOptional, IsArray, IsISO8601, IsOptional (+3 more)

### Community 103 - "initialSync.processor.ts"
Cohesion: 0.27
Nodes (11): libs_crm_shared_src_index_derivefirstname, libs_crm_shared_src_index_derivelastname, libs_crm_shared_src_index_resolvenamepart, deriveFirstName(), deriveLastName(), resolveNamePart(), splitName(), log (+3 more)

### Community 104 - "SalonsAuthenticatedController"
Cohesion: 0.26
Nodes (9): SalonsAuthenticatedController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Controller, Param, Post (+1 more)

### Community 106 - "CreateAppCategoryDto"
Cohesion: 0.20
Nodes (9): CreateAppCategoryDto, ApiProperty, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, Length (+1 more)

### Community 107 - "CreateServiceDto"
Cohesion: 0.18
Nodes (11): CreateServiceDto, ApiProperty, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString (+3 more)

### Community 108 - "UpdateServiceDto"
Cohesion: 0.18
Nodes (11): ApiProperty, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID (+3 more)

### Community 109 - "dependencies"
Cohesion: 0.08
Nodes (25): dependencies, argon2, bullmq, class-transformer, class-validator, jose, libphonenumber-js, @nestjs/common (+17 more)

### Community 110 - "CRM Workers & Sync"
Cohesion: 0.14
Nodes (16): Bookings worker (crm-bookings queue, calls /internal/bookings/rebase), Configuration, CRM rate limits, CRM Workers & Sync, Cron worker (only autonomous scheduler, BullMQ repeatable jobs), Data flow, EasyWeek fast-lane cap of 90 bookings, Fast vs slow isolation (+8 more)

### Community 111 - "Phone Number Validation"
Cohesion: 0.13
Nodes (14): Before vs After, Benefits, Custom Validator, 🔍 **Example Validations**, Features, Implementation, Library Details, Migration (+6 more)

### Community 112 - "OAuthSignInDto"
Cohesion: 0.18
Nodes (10): OAUTH_PROVIDERS, OAuthProvider, OAuthSignInDto, ApiProperty, ApiPropertyOptional, IsIn, IsNotEmpty, IsOptional (+2 more)

### Community 113 - "AccountRegistryService"
Cohesion: 0.07
Nodes (22): AccountRegistryService, Inject, Injectable, libs_crm_shared_src_index_tokenbundle, TokenBundle, decryptBundle(), encryptBundle(), EncryptedPayload (+14 more)

### Community 114 - "SalonClientsController"
Cohesion: 0.21
Nodes (11): SalonClientsController, ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Get (+3 more)

### Community 115 - "brand.controller.ts"
Cohesion: 0.06
Nodes (27): CrmSalonChangesController, ApiBearerAuth, ApiTags, Controller, BrandRepository, Injectable, BrandService, Injectable (+19 more)

### Community 116 - "GetTimeSlotsDto"
Cohesion: 0.22
Nodes (9): GetTimeSlotsDto, ApiProperty, ApiPropertyOptional, Expose, IsArray, IsOptional, IsUUID, Matches (+1 more)

### Community 117 - "GetBookableWorkersDto"
Cohesion: 0.22
Nodes (9): GetBookableWorkersDto, ApiPropertyOptional, Expose, IsArray, IsBoolean, IsISO8601, IsOptional, IsUUID (+1 more)

### Community 118 - "Key Features"
Cohesion: 0.15
Nodes (13): Authentication & Authorization, Booking Management, Brand & Salon Management, CRM Integration, Geolocation Search, Key Features, Onboarding, Geo source priority (viewport > center > Geo-IP > none) (+5 more)

### Community 119 - "OwnerServicesListQueryDto"
Cohesion: 0.22
Nodes (9): OwnerServicesListQueryDto, ApiProperty, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min (+1 more)

### Community 120 - "WorkersController"
Cohesion: 0.19
Nodes (10): ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, Controller, Get, Param (+2 more)

### Community 121 - "devDependencies"
Cohesion: 0.06
Nodes (35): devDependencies, concurrently, cross-env, dotenv-cli, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js (+27 more)

### Community 122 - "Sync Reconciliation"
Cohesion: 0.15
Nodes (12): Components, Configuration, Current status, Delivery logic, Enqueueing intents, Extending, Goals, High-level flow (+4 more)

### Community 123 - "FinalizeEasyWeekDto"
Cohesion: 0.18
Nodes (12): FinalizeEasyWeekDto, FinalizeEasyWeekSalonDto, ApiProperty, ArrayNotEmpty, IsArray, IsNotEmpty, IsOptional, IsString (+4 more)

### Community 124 - "GetBookableDatesDto"
Cohesion: 0.25
Nodes (8): GetBookableDatesDto, ApiPropertyOptional, Expose, IsArray, IsOptional, IsUUID, Matches, Transform

### Community 125 - "GetBookableServicesDto"
Cohesion: 0.25
Nodes (8): GetBookableServicesDto, ApiPropertyOptional, Expose, IsArray, IsISO8601, IsOptional, IsUUID, Transform

### Community 126 - "SalonListQuery"
Cohesion: 0.25
Nodes (7): SalonListQuery, IsInt, IsOptional, IsString, Length, Max, Min

### Community 127 - "Beautyn API — Architecture & Features"
Cohesion: 0.17
Nodes (11): API Routes, Beautyn API — Architecture & Features, Core Entities, CRM Entities, Cross-Cutting Concerns, Database, Domain Model, Migration Commands (+3 more)

### Community 128 - "nest-cli.json"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, plugins, $schema, sourceRoot

### Community 129 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): ./tsconfig.json, exclude, extends

### Community 130 - "CrmSyncOrchestratorService"
Cohesion: 0.31
Nodes (3): CrmSyncOrchestratorService, Injectable, Optional

### Community 131 - "SubmitSalonFromCrmDto"
Cohesion: 0.25
Nodes (7): SubmitSalonFromCrmDto, ApiPropertyOptional, IsArray, IsBoolean, IsObject, IsOptional, IsString

### Community 132 - "crm-internal.controller.ts"
Cohesion: 0.14
Nodes (7): libs_crm_adapter_src_index_crmadapterservice, EnsureCronSyncDto, IsOptional, IsString, CapsStub, ProvStub, SchedStub

### Community 133 - "package.json"
Cohesion: 0.05
Nodes (41): author, description, license, name, private, version, concurrently, cross-env (+33 more)

### Community 134 - "SalonSyncDto"
Cohesion: 0.29
Nodes (6): SalonSyncDto, IsEmail, IsNumber, IsOptional, IsString, Length

### Community 135 - "Beautyn API (B2B2C salon marketplace backend)"
Cohesion: 0.22
Nodes (10): API Gateway Pattern, Architecture, Background Workers, Beautyn API (B2B2C salon marketplace backend), Response Envelope, Supabase Auth (JWT guard chain), Sync Reconciliation (Outbox Pattern), IsValidPhone custom validator (+2 more)

### Community 136 - "BookingsInternalController"
Cohesion: 0.33
Nodes (7): BookingsInternalController, ApiExcludeController, Body, Controller, HttpCode, Post, UseGuards

### Community 137 - "salons.internal.controller.ts"
Cohesion: 0.22
Nodes (8): SalonInternalSyncDto, ApiProperty, IsObject, IsOptional, IsUUID, SalonPullDto, ApiProperty, IsUUID

### Community 138 - "README.md"
Cohesion: 0.17
Nodes (11): Compile and run the project, Configuration, CORS, Deployment, Description, License, Project setup, Resources (+3 more)

### Community 139 - "The 7 BullMQ sync workers (one process per queue)"
Cohesion: 0.25
Nodes (9): Local Redis service (redis:7-alpine, port 6380), The 7 BullMQ sync workers (one process per queue), Deterministic jobId overlap protection (sync:<type>:<lane>:<provider>:<salonId>), Change Proposal System (never mutate salon directly), CrmSalonDiffService (field-level CRM change detection), Canonicalize + SHA-256 hash baseline (crm_salon_last_hash), ConflictResolverService (push/pull/noop patch decisions), MergePolicyService (per-field SoT: APP/CRM/AUTO) (+1 more)

### Community 141 - "OnboardingService"
Cohesion: 0.16
Nodes (6): AltegioPartnerClient, Injectable, AltegioWebhookService, Injectable, OnboardingService, Injectable

### Community 142 - "onboarding.service.ts"
Cohesion: 0.21
Nodes (8): EasyWeekDiscoveryClient, EasyWeekLocation, HttpEasyWeekDiscoveryClient, OnboardingProgressDto, ApiProperty, OnboardingMapper, isSubscriptionStepEnabled(), ONBOARDING_SUBSCRIPTION_ENABLED

### Community 143 - "salon-clients.service.ts"
Cohesion: 0.36
Nodes (5): SalonClientDto, ApiProperty, SalonClientsListResponseDto, ApiProperty, SalonClientMapper

### Community 144 - "salons.controller.ts"
Cohesion: 0.11
Nodes (14): SalonImageDto, ApiProperty, Expose, SalonListResponseDto, ApiProperty, Expose, Type, SearchHistoryItemDto (+6 more)

### Community 145 - ".sync"
Cohesion: 0.20
Nodes (8): CategoriesInternalController, ApiExcludeController, ApiExcludeEndpoint, Body, Controller, HttpCode, Post, UseGuards

### Community 146 - "SharedModule"
Cohesion: 0.16
Nodes (11): ClientSettingsModule, Module, OwnerSettingsModule, Module, SalonClientsModule, Module, SharedModule, Global (+3 more)

### Community 147 - "CRM Salon Change Detection"
Cohesion: 0.25
Nodes (7): CRM Salon Change Detection, How Detection Works, Persistence Schema, Resolution Flow, Testing, Tracked Fields, Usage Entry Points

### Community 148 - "BrandSalonResponseDto"
Cohesion: 0.50
Nodes (3): BrandSalonResponseDto, ApiProperty, ApiPropertyOptional

### Community 149 - "Development"
Cohesion: 0.33
Nodes (6): Deployment, Development, Environment Setup, Key npm Scripts, Local Redis, Worker Configuration

### Community 150 - "AltegioLinkDto"
Cohesion: 0.50
Nodes (3): AltegioLinkDto, IsString, IsUUID

### Community 151 - "ConnectEasyWeekDto"
Cohesion: 0.50
Nodes (3): ConnectEasyWeekDto, IsString, IsUUID

### Community 152 - "EasyWeekLinkDto"
Cohesion: 0.50
Nodes (3): EasyWeekLinkDto, IsString, IsUUID

### Community 153 - "SearchHistory"
Cohesion: 0.50
Nodes (3): SearchHistory, ApiProperty, ApiPropertyOptional

### Community 155 - "CRM Retry Handler"
Cohesion: 0.33
Nodes (5): Circuit Breaker, CRM Retry Handler, Environment Defaults, Notes, Quick Start

### Community 156 - "outbox.processor.ts"
Cohesion: 0.13
Nodes (14): libs_crm_sync_scheduler_src_index_startsalonssyncworker, SyncDispatchJob, handleSyncDispatch(), log, startCronDiffWorker(), startSalonsSyncWorker(), bootstrap(), runWithRequestContext() (+6 more)

### Community 157 - "SalonClientLinker"
Cohesion: 0.38
Nodes (3): ClientIdentity, SalonClientLinker, Injectable

### Community 159 - "OwnerBookingsListQueryDto"
Cohesion: 0.20
Nodes (10): OwnerBookingsListQueryDto, ApiProperty, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max (+2 more)

### Community 160 - "OwnerClientsListQueryDto"
Cohesion: 0.20
Nodes (10): OwnerClientsListQueryDto, ApiProperty, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength (+2 more)

### Community 161 - "SyncSchedulerService"
Cohesion: 0.31
Nodes (4): libs_crm_sync_scheduler_src_index_job_sync, libs_crm_sync_scheduler_src_index_syncschedulerservice, SyncSchedulerService, Injectable

### Community 163 - "create-test-app.ts"
Cohesion: 0.17
Nodes (11): config, ref_dotenv, ref_path, ts-jest, { config }, path, cleanupTestApp(), cleanupTestData() (+3 more)

### Community 164 - "CapabilityRegistryService (typed provider capability flags, CRM_CAPS_PATH overrides)"
Cohesion: 0.40
Nodes (5): Altegio capability profile (webhooks=true, reschedule=true, maxBatch=200, granularity=5min), EasyWeek capability profile (reschedule=false -> cancel+recreate, maxBatch=100, granularity=10min), CapabilityRegistryService (typed provider capability flags, CRM_CAPS_PATH overrides), CircuitBreaker (CLOSED/OPEN/HALF_OPEN), CRM Shared (framework-agnostic types, CrmError, isRetryable)

### Community 165 - "EasyWeek widget booking confirmation (MVP)"
Cohesion: 0.40
Nodes (4): Data model changes, EasyWeek widget booking confirmation (MVP), Error handling, Flow

### Community 166 - "Token Storage (AES-256-GCM)"
Cohesion: 0.40
Nodes (4): API, Env, Provider matrix, Token Storage (AES-256-GCM)

### Community 167 - "Outbox Worker (outbox.processor.ts, consumes crm-outbox)"
Cohesion: 0.50
Nodes (5): Shared Logger (Winston JSON logs, x-request-id correlation), MappingRepository (internal<->external ID mappings), Outbox pattern for durable APP->CRM delivery, Outbox Worker (outbox.processor.ts, consumes crm-outbox), OutboxService (persists intents, queues crm-outbox jobs, jobId=intentId)

### Community 168 - ".list"
Cohesion: 0.22
Nodes (7): AppCategoriesPublicController, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Query

### Community 169 - "Salon clients"
Cohesion: 0.25
Nodes (7): Back-fill, Counters, Data model, How a booking finds its client, Owner endpoints, Salon clients, Troubleshooting

### Community 170 - "VerifyOtpDto"
Cohesion: 0.33
Nodes (6): ApiProperty, IsString, Length, Matches, Transform, VerifyOtpDto

### Community 171 - "categories.module.ts"
Cohesion: 0.26
Nodes (6): CapabilityRegistryModule, Module, libs_crm_capability_registry_src_index_capabilityregistrymodule, libs_crm_sync_scheduler_src_index_syncschedulermodule, BrandModule, Module

### Community 172 - "pagination.util.ts"
Cohesion: 0.47
Nodes (4): normalizePagination(), PaginationOptions, PaginationParams, toPositiveInt()

### Community 174 - "WellKnownController"
Cohesion: 0.40
Nodes (4): Controller, Get, Header, WellKnownController

### Community 176 - "CrmSalonPreviewRequestDto"
Cohesion: 0.40
Nodes (5): CrmSalonPreviewRequestDto, ApiProperty, IsEnum, IsString, Matches

### Community 177 - ".create"
Cohesion: 0.50
Nodes (3): ApiCreatedResponse, Body, Post

### Community 178 - "authenticated-api.module.ts"
Cohesion: 0.21
Nodes (12): AppCategoriesModule, Module, CrmSalonChangesModule, Module, HomeFeedModule, Module, SavedSalonsModule, Module (+4 more)

### Community 180 - "Account Registry (non-secret CRM config)"
Cohesion: 0.50
Nodes (3): Account Registry (non-secret CRM config), API, Stored fields

### Community 181 - "Capability Registry"
Cohesion: 0.50
Nodes (3): Capability Registry, Environment, Example

### Community 182 - "Provider Core"
Cohesion: 0.50
Nodes (3): Provider Core, Providers, Responsibilities

### Community 183 - "Shared Logger"
Cohesion: 0.50
Nodes (3): Environment Variables, Shared Logger, Usage

### Community 184 - "SalonImageSyncItemDto"
Cohesion: 0.50
Nodes (4): SalonImageSyncItemDto, IsInt, IsOptional, IsString

### Community 188 - "RegisterDto"
Cohesion: 0.22
Nodes (9): RegisterDto, ApiProperty, IsEmail, IsIn, IsNotEmpty, IsString, Matches, MaxLength (+1 more)

### Community 189 - "onboarding.module.ts"
Cohesion: 0.18
Nodes (10): SyncSchedulerModule, Module, CategoriesModule, Module, CrmSyncOrchestratorModule, Module, OnboardingModule, Module (+2 more)

### Community 190 - "ListQueryDto"
Cohesion: 0.29
Nodes (10): CATEGORY_LIST_MAX_LIMIT, ListQueryDto, OwnerListQueryDto, ApiProperty, IsInt, IsOptional, IsUUID, Max (+2 more)

### Community 192 - "ServicesSyncDto"
Cohesion: 0.12
Nodes (16): Body, HttpCode, Post, UseGuards, ServicesSyncDto, ServicesSyncServiceDto, ApiProperty, IsArray (+8 more)

### Community 193 - "UpdateCategoryDto"
Cohesion: 0.29
Nodes (7): ApiProperty, IsArray, IsInt, IsOptional, IsString, Length, UpdateCategoryDto

### Community 196 - "CorsCheckController"
Cohesion: 0.50
Nodes (3): CorsCheckController, Controller, Get

### Community 200 - "RefreshTokenDto"
Cohesion: 0.50
Nodes (4): RefreshTokenDto, ApiProperty, IsNotEmpty, IsString

### Community 202 - "salons.e2e-spec.ts"
Cohesion: 0.70
Nodes (3): buildInternalApp(), buildPublicApp(), withInternalKey()

### Community 206 - "SavedSalonsService"
Cohesion: 0.06
Nodes (29): SavedSalonsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Controller, Delete, Get (+21 more)

### Community 215 - "eslint.config.mjs"
Cohesion: 0.40
Nodes (4): @eslint/js, eslint-plugin-prettier, globals, typescript-eslint

## Knowledge Gaps
- **571 isolated node(s):** `config`, `AnyAccountData`, `Op`, `AltegioBookCategory`, `AltegioBookService` (+566 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1530 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `PrismaService`, `main.ts`, `app.module.ts`, `package.json`, `crm-internal.controller.ts`, `crm-integration.service.ts`, `sync-reconciliation/types.ts`, `salons.internal.controller.ts`, `auth.service.ts`, `user.service.ts`, `OnboardingService`, `onboarding.service.ts`, `salon-category-mappings.service.ts`, `salons.controller.ts`, `salon-clients.service.ts`, `SharedModule`, `home-feed.service.ts`, `test-app.workers.ts`, `altegio-booking.service.ts`, `client-identity.ts`, `booking-handler.service.ts`, `outbox.processor.ts`, `sync-scheduler/src/index.ts`, `SearchRequestDto`, `UserOwnershipGuard`, `BookingQueryService`, `shared/src/index.ts`, `create-test-app.ts`, `categories.module.ts`, `onboarding.controller.ts`, `skip-response-transform.decorator.ts`, `PhoneVerificationService`, `crm-salon-diff.service.ts`, `authenticated-api.module.ts`, `public-api.module.ts`, `createChildLogger`, `onboarding.module.ts`, `crm-integration.module.ts`, `crm-internal.module.ts`, `SalonClientsRepository`, `salons.e2e-spec.ts`, `sync.internal.controller.ts`, `SavedSalonsService`, `user-settings.service.ts`, `shared.module.ts`, `capability-registry.service.ts`, `easyweek-booking.service.ts`, `auth.public.controller.ts`, `@nestjs/swagger`, `WorkerDto`, `app-categories.service.ts`, `services.service.ts`, `HomeFeedSectionConfigService`, `AccountRegistryService`, `brand.controller.ts`?**
  _High betweenness centrality (0.234) - this node is a cross-community bridge._
- **Why does `@nestjs/swagger` connect `@nestjs/swagger` to `main.ts`, `SubmitSalonFromCrmDto`, `crm-internal.controller.ts`, `package.json`, `crm-integration.service.ts`, `salons.internal.controller.ts`, `auth.service.ts`, `UpsertWorkerDto`, `user.service.ts`, `onboarding.service.ts`, `salon-category-mappings.service.ts`, `salons.controller.ts`, `salon-clients.service.ts`, `BrandSalonResponseDto`, `home-feed.service.ts`, `test-app.workers.ts`, `altegio-booking.service.ts`, `SearchHistory`, `outbox.processor.ts`, `SearchRequestDto`, `shared/src/index.ts`, `SearchService`, `user.entity.ts`, `@nestjs/common`, `AuthService`, `onboarding.controller.ts`, `Page`, `ListQueryDto`, `SalonClientsRepository`, `booking.response.dto.ts`, `sync.internal.controller.ts`, `SavedSalonsService`, `easyweek-booking.service.ts`, `auth.public.controller.ts`, `WorkerDto`, `app-categories.service.ts`, `services.service.ts`, `OAuthSignInDto`, `brand.controller.ts`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `class-validator` connect `@nestjs/swagger` to `PrismaService`, `SubmitSalonFromCrmDto`, `crm-internal.controller.ts`, `package.json`, `SalonSyncDto`, `crm-integration.service.ts`, `salons.internal.controller.ts`, `auth.service.ts`, `UpsertWorkerDto`, `AltegioLinkDto`, `ConnectEasyWeekDto`, `EasyWeekLinkDto`, `SearchRequestDto`, `shared/src/index.ts`, `onboarding.controller.ts`, `Page`, `ListQueryDto`, `UpdateUserDto`, `SalonClientsRepository`, `sync.internal.controller.ts`, `.list`, `easyweek-booking.service.ts`, `app-categories.service.ts`, `OAuthSignInDto`, `brand.controller.ts`, `SalonListQuery`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **What connects `config`, `AnyAccountData`, `Op` to the rest of the system?**
  _571 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.022727272727272728 - nodes in this community are weakly interconnected._
- **Should `PrismaService` be split into smaller, more focused modules?**
  _Cohesion score 0.07918552036199095 - nodes in this community are weakly interconnected._
- **Should `main.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.061952861952861954 - nodes in this community are weakly interconnected._