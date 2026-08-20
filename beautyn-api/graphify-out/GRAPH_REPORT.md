# Graph Report - beautyn-api  (2026-08-20)

## Corpus Check
- 545 files · ~149,508 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3552 nodes · 8306 edges · 226 communities (175 shown, 51 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 129 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `82f9211a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- NPM Scripts & Build Tooling
- Repositories & EasyWeek Booking
- Bookings Sync & Auth DTOs
- Categories Sync Controllers
- API Gateway Modules
- Sync Reconciliation & Conflict Resolution
- Architecture Docs & CRM Concepts
- Altegio/EasyWeek Provider Records
- Internal Categories Controllers
- Workers Sync & UUID Identity
- Public Auth Endpoints & DTOs
- CRM Adapter Service
- User Account & Notifications
- Onboarding Flow Controller
- Booking Handler Service
- Category Mappings Controllers
- Provider Booking Pullers
- Altegio Booking Flow Types
- Search Seed Data & Scripts
- Schedule Formatting Utilities
- Home Feed DTOs
- Account Registry & Altegio Provider
- Workers Controllers
- Auth Public Controller
- Swagger Decorator Cluster
- Altegio Public Booking DTOs
- Authenticated Client Controllers
- Brand Repository
- Home Feed Section DTOs
- Sync Scheduler & Queues
- SearchRequestDto
- BrandController
- salons.internal.controller.ts
- BookingQueryService
- index.ts
- index.ts
- altegio-webhook.controller.ts
- bookings.owner.controller.ts
- SavedSalonListQueryDto
- ServicesAuthenticatedController
- ServicesService
- WorkersAuthenticatedController
- compilerOptions
- onboarding.controller.ts
- SearchHistoryService
- PhoneVerificationService
- AltegioProvider
- .uploadImage()
- .get()
- crm-salon-diff.service.ts
- onboarding.module.ts
- brand.controller.ts
- AppCategoriesRepository
- SavedSalonsService
- paths
- public-api.module.ts
- ProviderFactory
- fakes.prisma.workers.ts
- createChildLogger()
- OwnerBookingsController
- HomeFeedSectionsAdminController
- HomeFeedSectionConfigRepository
- ServicesListQuery
- WorkersListQuery
- authenticated-api.module.ts
- .getHomeFeed()
- SearchService
- UpdateUserDto
- crm-internal.controller.ts
- ClientBookingsController
- CrmSalonChangesController
- .confirm()
- .upload()
- app-categories.service.ts
- AuthService
- AltegioBookingService
- OwnerSettingsService
- Lane
- salons.authenticated.controller.ts
- .updateNotifications()
- .searchPins()
- SendOtpDto
- shared.module.ts
- CapabilityRegistryService
- EasyWeekBooking
- internal-api.module.ts
- search.service.ts
- BookingSyncService
- ClientSettingsResponseDto
- SearchQueryBuilderService
- runWithRequestContext()
- .create()
- BookingDto
- AltegioBookingPublicController
- SkipResponseTransform()
- ClientSettingsService
- ServicesRepository
- WorkersRepository
- CircuitBreaker
- ListAppCategoriesQueryDto
- SalonService
- ServicesSyncDto
- CreateAltegioRecordDto
- initialSync.processor.ts
- SalonsAuthenticatedController
- bookings.internal.controller.ts
- CreateAppCategoryDto
- CreateServiceDto
- UpdateServiceDto
- dependencies
- executeWithRetry()
- categories.controller.ts
- OAuthSignInDto
- crypto.helper.ts
- OwnerSettingsResponseDto
- UpdateAppCategoryDto
- GetTimeSlotsDto
- GetBookableWorkersDto
- CrmSalonDiffService
- OwnerServicesListQueryDto
- SharedModule
- devDependencies
- ServicesInternalController
- AppCategoriesPublicController
- GetBookableDatesDto
- GetBookableServicesDto
- SalonListQuery
- logger.module.ts
- nest-cli.json
- exclude
- CrmSyncOrchestratorService
- SubmitSalonFromCrmDto
- crm-adapter.spec.ts
- package.json
- SalonSyncDto
- user-settings.service.ts
- @prisma/client
- salons.e2e-spec.ts
- search.authenticated.controller.ts
- storage.controller.ts
- .sync()
- category-owner.guard.ts
- OnboardingProgressDto
- salon-owner.guard.ts
- RefreshTokenDto
- GetCrmSalonChangesQuery
- UserSettingsService
- MemRepo
- BrandSalonResponseDto
- SelectBrandSalonDto
- AltegioLinkDto
- ConnectEasyWeekDto
- EasyWeekLinkDto
- SearchHistory
- UserOwnershipGuard
- MemRepo
- startSalonsSyncWorker()
- cleanup-local.ts
- JestSummaryReporter
- signature.ts
- CrmLinkedDto
- CrmSalonPreviewDto
- User
- test-env.js
- argon2
- class-transformer
- class-validator
- concurrently
- cross-env
- eslint
- eslint-config-prettier
- @eslint/eslintrc
- @eslint/js
- eslint-plugin-prettier
- globals
- jest
- jest.config.ts
- jsonwebtoken
- libphonenumber-js
- @nestjs/cli
- @nestjs/common
- @nestjs/config
- @nestjs/core
- @nestjs/passport
- @nestjs/swagger
- @nestjs/throttler
- passport
- passport-jwt
- pg
- reflect-metadata
- rxjs
- user-settings.service.ts
- ServicesInternalController
- UpdateCategoryDto
- prettier
- prisma
- ProviderContext
- supertest
- ts-jest
- ts-loader
- StorageService
- tsc-alias
- create-test-app.ts
- salons.e2e-spec.ts
- @types/jest
- @types/jsonwebtoken
- category-owner.guard.ts
- UserSettingsService
- dotenv-cli
- @eslint/eslintrc
- @eslint/js
- wait-on
- brand.entity.ts
- brand-member.entity.ts
- @nestjs/cli
- source-map-support
- ts-node
- tsconfig-paths
- @types/express
- @types/multer
- @types/node
- @types/passport
- @types/passport-jwt
- @types/supertest
- typescript-eslint

## God Nodes (most connected - your core abstractions)
1. `PrismaService` - 108 edges
2. `CrmType` - 105 edges
3. `scripts` - 80 edges
4. `bootstrap()` - 79 edges
5. `CrmIntegrationService` - 72 edges
6. `BookingHandlerService` - 51 edges
7. `Page` - 46 edges
8. `JwtAuthGuard` - 45 edges
9. `WorkersService` - 38 edges
10. `BookingQueryService` - 37 edges

## Surprising Connections (you probably didn't know these)
- `formatWorkingSchedule()` --indirect_call--> `d()`  [INFERRED]
  libs/crm/provider-core/src/dtos.ts → test/unit/working-schedule.spec.ts
- `buildPublicApp()` --indirect_call--> `WorkersController`  [INFERRED]
  test/workers/utils/test-app.workers.ts → src/api-gateway/v1/public/workers.controller.ts
- `buildInternalApp()` --indirect_call--> `InternalApiKeyGuard`  [INFERRED]
  test/salon/utils/test-app.salon.ts → src/shared/guards/internal-api-key.guard.ts
- `buildInternalApp()` --indirect_call--> `InternalApiKeyGuard`  [INFERRED]
  test/workers/utils/test-app.workers.ts → src/shared/guards/internal-api-key.guard.ts
- `createTestApp()` --indirect_call--> `SharedModule`  [INFERRED]
  test-utils/create-test-app.ts → src/shared/shared.module.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CRM Integration Stack (Adapter -> Provider Core -> Retry/Token/Capability/Account/Scheduler)** — libs_crm_adapter_readme_crmadapter, libs_crm_provider_core_readme_providercore, libs_crm_capability_registry_readme_capabilityregistryservice, libs_crm_retry_handler_readme_executewithretry, libs_crm_token_storage_readme_tokenstorageservice, libs_crm_account_registry_readme_accountregistry, libs_crm_sync_scheduler_readme_syncscheduler [EXTRACTED 1.00]
- **Outbox Delivery Pipeline (durable APP->CRM reconciliation)** — src_sync_reconciliation_readme_outboxservice, src_sync_reconciliation_readme_outboxprocessor, src_sync_reconciliation_readme_mappingrepository, src_sync_reconciliation_readme_shadowstore, src_sync_reconciliation_readme_mergepolicyservice, src_sync_reconciliation_readme_conflictresolverservice [EXTRACTED 1.00]
- **Two-Lane Bookings Poller Flow (cron tick -> dispatch -> per-salon rebase)** — docs_workers_cron_worker, docs_workers_internal_sync_api, docs_workers_bookings_worker, docs_workers_two_lane_bookings_poller, libs_crm_sync_scheduler_readme_syncscheduler [EXTRACTED 1.00]

## Communities (226 total, 51 thin omitted)

### Community 0 - "NPM Scripts & Build Tooling"
Cohesion: 0.03
Nodes (79): scripts, build, build:railway, cleanup:dev, cleanup:local, db:deploy, db:dev:deploy, db:dev:migrate (+71 more)

### Community 1 - "Repositories & EasyWeek Booking"
Cohesion: 0.11
Nodes (13): UpsertInput, ServiceUpsertData, PrismaService, Injectable, SalonOwnerGuard, SalonOwnerRequest, Injectable, WorkerWithServices (+5 more)

### Community 2 - "Bookings Sync & Auth DTOs"
Cohesion: 0.10
Nodes (34): SyncBookingsJobResponseDto, SyncBookingsNowResponseDto, ApiProperty, SyncSalonJobResponseDto, ApiProperty, SalonCategoryMappingResponseDto, LoginResponseDto, ApiProperty (+26 more)

### Community 3 - "Categories Sync Controllers"
Cohesion: 0.17
Nodes (19): CategoriesAuthenticatedController, ApiAcceptedResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation (+11 more)

### Community 4 - "API Gateway Modules"
Cohesion: 0.13
Nodes (16): AppModule, Module, JwtAuthGuard, Injectable, Envelope, TransformInterceptor, Injectable, StorageModule (+8 more)

### Community 5 - "Sync Reconciliation & Conflict Resolution"
Cohesion: 0.06
Nodes (27): ConflictResolverService, Decision, Injectable, MappingRepository, DEFAULT_POLICY, MergePolicyService, Injectable, clampDuration() (+19 more)

### Community 6 - "Architecture Docs & CRM Concepts"
Cohesion: 0.26
Nodes (16): CRM Integration Layer, Onboarding Flow (CRM connect -> brand -> subscription), Altegio CRM Integration (sync API reference), Altegio booking-create idempotency (dedupe by client/datetime/staff/services), Altegio dual-token auth (Bearer + User headers), EasyWeek booking-create idempotency (dedupe by phone/reserved_on/service), EasyWeek CRM Integration (sync API reference), EasyWeek widget booking confirmation (POST /bookings/easyweek/confirm) (+8 more)

### Community 7 - "Altegio/EasyWeek Provider Records"
Cohesion: 0.11
Nodes (21): Op, ListRecordsParams, BookingData, CategoryData, ServiceData, WorkerData, WorkerSchedule, AvailabilitySlot (+13 more)

### Community 8 - "Internal Categories Controllers"
Cohesion: 0.16
Nodes (6): CategoriesService, Injectable, normalizeHexColor(), toCategoryResponse(), CategoriesRepository, Injectable

### Community 9 - "Workers Sync & UUID Identity"
Cohesion: 0.25
Nodes (7): ApiProperty, IsBoolean, IsNotEmpty, IsOptional, IsString, Length, UpsertWorkerDto

### Community 10 - "Public Auth Endpoints & DTOs"
Cohesion: 0.07
Nodes (30): CheckEmailDto, ApiProperty, IsEmail, CheckEmailResponseDto, EmailStatus, ApiProperty, FORGOT_PASSWORD_CLIENTS, ForgotPasswordClient (+22 more)

### Community 11 - "CRM Adapter Service"
Cohesion: 0.11
Nodes (5): CrmAdapterService, Injectable, CrmType, CrmIntegrationService, Injectable

### Community 12 - "User Account & Notifications"
Cohesion: 0.07
Nodes (14): AuthService, Injectable, NotificationUserDto, ApiProperty, Expose, Injectable, UserRepository, userSelect (+6 more)

### Community 13 - "Onboarding Flow Controller"
Cohesion: 0.06
Nodes (40): OnboardingController, ApiAcceptedResponse, ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags (+32 more)

### Community 15 - "Category Mappings Controllers"
Cohesion: 0.12
Nodes (11): ApiProperty, IsBoolean, IsOptional, IsUUID, UpdateSalonCategoryMappingDto, toSalonCategoryMappingResponse(), SalonCategoryMappingsRepository, Injectable (+3 more)

### Community 16 - "Provider Booking Pullers"
Cohesion: 0.11
Nodes (16): fetchBooking(), normalizeBooking(), pullBookings(), wait(), CrmError, isRetryable(), ErrorKind, ProviderId (+8 more)

### Community 17 - "Altegio Booking Flow Types"
Cohesion: 0.08
Nodes (37): AltegioBookCategory, AltegioBookDatesResponse, AltegioBookService, AltegioBookServicesResponse, AltegioBookStaff, AltegioBookStaffResponse, AltegioBookTime, AltegioBookTimesResponse (+29 more)

### Community 18 - "Search Seed Data & Scripts"
Cohesion: 0.09
Nodes (33): backfillSalonSchedules(), buildCatalogRows(), CatalogRows, CATEGORY_IMAGES, CRM_CATEGORY_TO_APP_SLUG, CRM_OWNER_EMAILS, CrmAnchor, CrmCatalogCategory (+25 more)

### Community 19 - "Schedule Formatting Utilities"
Cohesion: 0.13
Nodes (20): Day, DAY_NAME, dayHours(), formatWorkingDay(), formatWorkingSchedule(), Hhmm, toDotHhmm(), WorkerScheduleDay (+12 more)

### Community 20 - "Home Feed DTOs"
Cohesion: 0.13
Nodes (14): HomeFeedSalonCardDto, ApiProperty, ApiPropertyOptional, HomeFeedSectionDto, ApiProperty, ApiPropertyOptional, HomeFeedSectionSearchParamsDto, ApiPropertyOptional (+6 more)

### Community 21 - "Account Registry & Altegio Provider"
Cohesion: 0.05
Nodes (38): 1. Purpose, 2. Responsibilities, 3.1.1 LocationType, 3.1.2 SearchRequestDto, 3.1.3 SearchResponseDto, 3.1.4 SearchSuggestionDto (removed), 3.1.5 SearchHistoryItemDto, 3.1 Types & DTOs (+30 more)

### Community 22 - "Workers Controllers"
Cohesion: 0.13
Nodes (15): RFC-4122, uuidV5FromStrings(), ApiExcludeController, ApiExcludeEndpoint, Body, Controller, HttpCode, Post (+7 more)

### Community 23 - "Auth Public Controller"
Cohesion: 0.23
Nodes (19): ApiForbiddenResponse, AuthPublicController, ApiAcceptedResponse, ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse (+11 more)

### Community 24 - "Swagger Decorator Cluster"
Cohesion: 0.13
Nodes (19): ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse (+11 more)

### Community 25 - "Altegio Public Booking DTOs"
Cohesion: 0.16
Nodes (18): BookableDatesResponseDto, ApiProperty, BookableServiceCategoryDto, BookableServiceDto, BookableServicesResponseDto, ApiProperty, BookableWorkerDto, BookableWorkersResponseDto (+10 more)

### Community 26 - "Authenticated Client Controllers"
Cohesion: 0.22
Nodes (8): ApiGatewayModule, Module, AuthenticatedApiModule, Module, InternalApiModule, Module, PublicApiModule, Module

### Community 27 - "Brand Repository"
Cohesion: 0.17
Nodes (4): BrandRepository, BrandWithCount, Injectable, isSubscriptionStepEnabled()

### Community 28 - "Home Feed Section DTOs"
Cohesion: 0.18
Nodes (11): HomeFeedSectionFiltersDto, ApiPropertyOptional, IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID (+3 more)

### Community 29 - "Sync Scheduler & Queues"
Cohesion: 0.15
Nodes (11): BullQueueLike, makeQueue(), SyncSchedulerService, Injectable, CronDiffJob, CronDiffJobWithSchedule, SyncJob, log (+3 more)

### Community 30 - "SearchRequestDto"
Cohesion: 0.05
Nodes (50): SearchPublicController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, Body, Controller, Get (+42 more)

### Community 31 - "BrandController"
Cohesion: 0.20
Nodes (16): Put, BrandController, ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiQuery, ApiTags (+8 more)

### Community 32 - "salons.internal.controller.ts"
Cohesion: 0.29
Nodes (8): SalonsInternalController, ApiExcludeController, Body, Controller, HttpCode, Param, Post, UseGuards

### Community 33 - "BookingQueryService"
Cohesion: 0.17
Nodes (6): BookingQueryService, BookingWithRelations, Injectable, BookingListResponseDto, BookingProviderAltegioDto, BookingProviderEasyweekDto

### Community 34 - "index.ts"
Cohesion: 0.08
Nodes (16): AccountRegistryModule, Module, AccountRegistryService, Inject, Injectable, PrismaAccountRegistryRepository, Injectable, AccountRegistryRepository (+8 more)

### Community 36 - "altegio-webhook.controller.ts"
Cohesion: 0.10
Nodes (17): Res, AltegioWebhookController, ApiExcludeController, Body, Controller, Get, Post, Query (+9 more)

### Community 37 - "bookings.owner.controller.ts"
Cohesion: 0.13
Nodes (15): CategoriesInternalController, log, ApiExcludeController, Controller, SalonAccessGuard, Injectable, CategoryOwnerGuard, CategoryRequest (+7 more)

### Community 38 - "SavedSalonListQueryDto"
Cohesion: 0.16
Nodes (14): SavedSalonsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Controller, Delete, Get (+6 more)

### Community 39 - "ServicesAuthenticatedController"
Cohesion: 0.17
Nodes (19): ServicesAuthenticatedController, ApiAcceptedResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation (+11 more)

### Community 40 - "ServicesService"
Cohesion: 0.24
Nodes (3): ServiceRecord, ServicesService, Injectable

### Community 41 - "WorkersAuthenticatedController"
Cohesion: 0.18
Nodes (18): ApiAcceptedResponse, ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, Body (+10 more)

### Community 42 - "compilerOptions"
Cohesion: 0.08
Nodes (24): ./tsconfig.base.json, compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+16 more)

### Community 43 - "onboarding.controller.ts"
Cohesion: 0.14
Nodes (16): AltegioPairCodeResponseDto, ApiProperty, CrmFieldDto, CrmProviderDto, CrmProviderLinksDto, ApiProperty, CrmProviderListResponseDto, ApiProperty (+8 more)

### Community 44 - "SearchHistoryService"
Cohesion: 0.10
Nodes (20): SearchAuthenticatedController, ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Delete (+12 more)

### Community 45 - "PhoneVerificationService"
Cohesion: 0.14
Nodes (9): PhoneVerificationService, Inject, Injectable, Optional, VerificationSession, MockSmsProvider, SMS_PROVIDER, SmsProvider (+1 more)

### Community 46 - "AltegioProvider"
Cohesion: 0.12
Nodes (3): AltegioBooking, AltegioProvider, Page

### Community 47 - ".uploadImage()"
Cohesion: 0.16
Nodes (18): AppCategoriesController, ApiBearerAuth, ApiConsumes, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags (+10 more)

### Community 48 - ".get()"
Cohesion: 0.19
Nodes (13): SalonsController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, Controller (+5 more)

### Community 49 - "crm-salon-diff.service.ts"
Cohesion: 0.11
Nodes (20): applyFieldPatch(), buildLocalSnapshot(), CrmSalonDiffService, LocalSalonSnapshot, PendingOperation, toPrismaJson(), TRACKED_FIELDS, TrackedField (+12 more)

### Community 50 - "onboarding.module.ts"
Cohesion: 0.07
Nodes (26): 10) Staff — Update, 11) Staff Schedule — Get (read‑only), 12) Records (Bookings) — Create, 13) Records (Bookings) — Update (reschedule/comment), 14) Records (Bookings) — Delete, 15) Records (Bookings) — List (by client, with_deleted), 1) Companies / Salon Profile — List Companies, 2) Companies / Salon Profile — Get Company (canonical) (+18 more)

### Community 51 - "brand.controller.ts"
Cohesion: 0.09
Nodes (21): 10) Booking — Cancel, 1) Workspace, 2) Locations (Salons), 3) Service Categories, 4) Services, 5) Staff (Workers), 6) Accounts (for completion payments), 7) Availability (+13 more)

### Community 52 - "AppCategoriesRepository"
Cohesion: 0.11
Nodes (7): AppCategoriesService, Injectable, toAppCategoryResponse(), AppCategoriesRepository, Injectable, StorageService, Injectable

### Community 53 - "SavedSalonsService"
Cohesion: 0.14
Nodes (14): MIME_TO_EXT, ConfirmEasyweekBookingDto, ApiProperty, IsUUID, ConfirmEasyweekBookingResponseDto, EasyweekBookingSummaryDto, ApiProperty, ApiPropertyOptional (+6 more)

### Community 54 - "paths"
Cohesion: 0.09
Nodes (21): libs/crm/account-registry/src, libs/crm/adapter/src, libs/crm/capability-registry/src, libs/crm/provider-core/src, libs/crm/retry-handler/src, libs/crm/shared/src, libs/crm/sync-scheduler/src, libs/crm/token-storage/src (+13 more)

### Community 55 - "public-api.module.ts"
Cohesion: 0.16
Nodes (11): HealthController, Controller, Get, AuthModule, Module, PhoneVerificationModule, Module, SyncTriggerService (+3 more)

### Community 56 - "ProviderFactory"
Cohesion: 0.17
Nodes (16): ProviderCoreModule, Module, ProviderFactory, Injectable, bootstrap(), bootstrap(), bootstrap(), envBool() (+8 more)

### Community 57 - "fakes.prisma.workers.ts"
Cohesion: 0.10
Nodes (11): createFakePrismaForSalon(), count(), createFakePrismaForWorkers(), FakePrismaWorkersApi, ServiceRecord, TextContains, update(), WorkerCreateData (+3 more)

### Community 58 - "createChildLogger()"
Cohesion: 0.16
Nodes (9): notImplemented(), als, getRequestId(), RequestContext, baseLogger, createChildLogger(), LoggerLike, LogLevel (+1 more)

### Community 59 - "OwnerBookingsController"
Cohesion: 0.17
Nodes (13): OwnerBookingsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller, Get (+5 more)

### Community 60 - "HomeFeedSectionsAdminController"
Cohesion: 0.12
Nodes (16): HomeFeedSectionsAdminController, ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, Body (+8 more)

### Community 61 - "HomeFeedSectionConfigRepository"
Cohesion: 0.15
Nodes (13): CreateHomeFeedSectionDto, ApiProperty, ApiPropertyOptional, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString (+5 more)

### Community 62 - "ServicesListQuery"
Cohesion: 0.09
Nodes (17): ServicesController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Query (+9 more)

### Community 63 - "WorkersListQuery"
Cohesion: 0.12
Nodes (13): PublicWorkerDto, ApiProperty, ApiProperty, IsBoolean, IsInt, IsOptional, IsString, IsUUID (+5 more)

### Community 64 - "authenticated-api.module.ts"
Cohesion: 0.20
Nodes (17): AltegioBookingModule, Module, BookingModule, Module, EasyweekBookingModule, Module, CrmIntegrationModule, Module (+9 more)

### Community 65 - ".getHomeFeed()"
Cohesion: 0.09
Nodes (18): HomeFeedController, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Query, Req (+10 more)

### Community 67 - "UpdateUserDto"
Cohesion: 0.09
Nodes (21): ApiProperty, IsString, Length, Matches, Transform, VerifyOtpDto, ALLOWED_AVATAR_DOMAINS, IsAllowedAvatarDomain() (+13 more)

### Community 68 - "crm-internal.controller.ts"
Cohesion: 0.20
Nodes (7): CrmInternalController, ApiExcludeController, Controller, UseGuards, EnsureCronSyncDto, IsOptional, IsString

### Community 69 - "ClientBookingsController"
Cohesion: 0.18
Nodes (12): ClientBookingsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Param (+4 more)

### Community 70 - "CrmSalonChangesController"
Cohesion: 0.27
Nodes (7): CrmSalonChangeDto, ApiProperty, GetCrmSalonChangesQuery, IsEnum, IsOptional, IsUUID, CrmSalonChangeMapper

### Community 71 - ".confirm()"
Cohesion: 0.13
Nodes (11): EasyweekBookingAuthenticatedController, ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller (+3 more)

### Community 72 - ".upload()"
Cohesion: 0.14
Nodes (14): StorageController, ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags, Controller, Delete (+6 more)

### Community 73 - "app-categories.service.ts"
Cohesion: 0.15
Nodes (15): AppCategoryListResponseDto, ApiProperty, AppCategoryResponseDto, ApiProperty, HomeFeedNextBookingDto, HomeFeedNextBookingServiceDto, ApiProperty, ApiPropertyOptional (+7 more)

### Community 74 - "AuthService"
Cohesion: 0.14
Nodes (14): ApiExcludeEndpoint, Body, HttpCode, Post, UseGuards, CategoriesSyncDto, CategorySyncItemDto, ApiProperty (+6 more)

### Community 76 - "OwnerSettingsService"
Cohesion: 0.27
Nodes (4): OwnerSettingsRepository, Injectable, OwnerSettingsService, Injectable

### Community 77 - "Lane"
Cohesion: 0.16
Nodes (10): SyncInternalController, ApiExcludeController, Body, Controller, HttpCode, Post, UseGuards, SyncDispatchDto (+2 more)

### Community 78 - "salons.authenticated.controller.ts"
Cohesion: 0.20
Nodes (8): CategoriesPublicController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Query

### Community 79 - ".updateNotifications()"
Cohesion: 0.15
Nodes (13): ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, Body, Controller (+5 more)

### Community 80 - ".searchPins()"
Cohesion: 0.19
Nodes (13): CrmSalonChangesController, ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Controller, Get (+5 more)

### Community 81 - "SendOtpDto"
Cohesion: 0.40
Nodes (5): SendOtpDto, ApiProperty, IsString, Matches, Transform

### Community 82 - "shared.module.ts"
Cohesion: 0.16
Nodes (6): Catch, EnvelopeExceptionFilter, AppConfigService, Injectable, HashService, Injectable

### Community 83 - "CapabilityRegistryService"
Cohesion: 0.18
Nodes (9): CapabilityRegistryService, deepMerge(), isRecord(), loadDefaultMapWithCandidates(), loadJson(), loadOverride(), Injectable, Capability (+1 more)

### Community 84 - "EasyWeekBooking"
Cohesion: 0.15
Nodes (16): EasyWeekBooking, NormalizedEasyweek, AltegioBookingPayload, AltegioBookingsSyncDto, EasyweekBookingPayload, EasyweekBookingsSyncDto, ApiProperty, IsArray (+8 more)

### Community 85 - "internal-api.module.ts"
Cohesion: 0.13
Nodes (15): ChangePasswordDto, ApiProperty, IsNotEmpty, IsString, Matches, MaxLength, MinLength, ResetPasswordResponseDto (+7 more)

### Community 86 - "search.service.ts"
Cohesion: 0.19
Nodes (13): AppCategoryMappingsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller, Get (+5 more)

### Community 87 - "BookingSyncService"
Cohesion: 0.25
Nodes (8): CreateCategoryDto, ApiProperty, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Length

### Community 88 - "ClientSettingsResponseDto"
Cohesion: 0.17
Nodes (12): settingsOneOf(), ClientNotificationSettingsDto, ApiProperty, Expose, ClientSettingsResponseDto, ApiProperty, Expose, Type (+4 more)

### Community 89 - "SearchQueryBuilderService"
Cohesion: 0.31
Nodes (8): ApiProperty, WorkerDto, ApiProperty, WorkersListResponseDto, ApiProperty, WorkersSyncJobResponseDto, WorkersSyncResultDto, WorkerMapper

### Community 90 - "runWithRequestContext()"
Cohesion: 0.14
Nodes (5): Injectable, WorkersCategory, WorkerEntityInput, Injectable, WorkersService

### Community 91 - ".create()"
Cohesion: 0.14
Nodes (12): AltegioBookingAuthenticatedController, ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller (+4 more)

### Community 92 - "BookingDto"
Cohesion: 0.12
Nodes (17): Lane, BookingsInternalController, ApiExcludeController, Body, Controller, HttpCode, Post, UseGuards (+9 more)

### Community 93 - "AltegioBookingPublicController"
Cohesion: 0.34
Nodes (9): AltegioBookingPublicController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Param (+1 more)

### Community 94 - "SkipResponseTransform()"
Cohesion: 0.19
Nodes (9): AuthResetController, Controller, Get, Header, Controller, Get, Header, WellKnownController (+1 more)

### Community 95 - "ClientSettingsService"
Cohesion: 0.27
Nodes (4): ClientSettingsRepository, Injectable, ClientSettingsService, Injectable

### Community 98 - "CircuitBreaker"
Cohesion: 0.27
Nodes (4): BreakerOpenError, CircuitBreaker, BreakerState, CircuitBreakerOptions

### Community 99 - "ListAppCategoriesQueryDto"
Cohesion: 0.11
Nodes (17): AppCategoriesPublicController, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Query, ListAppCategoriesQueryDto (+9 more)

### Community 100 - "SalonService"
Cohesion: 0.19
Nodes (6): SalonDto, ApiProperty, Expose, SalonIncludeOptions, SalonService, Injectable

### Community 101 - "ServicesSyncDto"
Cohesion: 0.16
Nodes (15): ServiceDto, ApiProperty, Expose, ServiceResponseDto, ApiProperty, ServicesListResponseDto, ApiProperty, Expose (+7 more)

### Community 102 - "CreateAltegioRecordDto"
Cohesion: 0.13
Nodes (15): ArrayMaxSize, ArrayMinSize, SalonContext, CreateAltegioRecordDto, ApiProperty, ApiPropertyOptional, IsArray, IsISO8601 (+7 more)

### Community 103 - "initialSync.processor.ts"
Cohesion: 0.36
Nodes (8): deriveFirstName(), deriveLastName(), resolveNamePart(), splitName(), log, toWorkerPayload(), log, mapWorkerForSync()

### Community 104 - "SalonsAuthenticatedController"
Cohesion: 0.26
Nodes (9): SalonsAuthenticatedController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Controller, Param, Post (+1 more)

### Community 105 - "bookings.internal.controller.ts"
Cohesion: 0.18
Nodes (4): HomeFeedSectionConfigRepository, Injectable, HomeFeedSectionConfigService, Injectable

### Community 106 - "CreateAppCategoryDto"
Cohesion: 0.12
Nodes (19): MIME_TO_EXT, CreateAppCategoryDto, ApiProperty, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString (+11 more)

### Community 107 - "CreateServiceDto"
Cohesion: 0.18
Nodes (11): CreateServiceDto, ApiProperty, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString (+3 more)

### Community 108 - "UpdateServiceDto"
Cohesion: 0.18
Nodes (11): ApiProperty, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID (+3 more)

### Community 109 - "dependencies"
Cohesion: 0.04
Nodes (47): argon2, bullmq, class-transformer, class-validator, jose, libphonenumber-js, @nestjs/common, @nestjs/config (+39 more)

### Community 110 - "executeWithRetry()"
Cohesion: 0.14
Nodes (16): Bookings worker (crm-bookings queue, calls /internal/bookings/rebase), Configuration, CRM rate limits, CRM Workers & Sync, Cron worker (only autonomous scheduler, BullMQ repeatable jobs), Data flow, EasyWeek fast-lane cap of 90 bookings, Fast vs slow isolation (+8 more)

### Community 111 - "categories.controller.ts"
Cohesion: 0.13
Nodes (14): Before vs After, Benefits, Custom Validator, 🔍 **Example Validations**, Features, Implementation, Library Details, Migration (+6 more)

### Community 112 - "OAuthSignInDto"
Cohesion: 0.18
Nodes (10): OAUTH_PROVIDERS, OAuthProvider, OAuthSignInDto, ApiProperty, ApiPropertyOptional, IsIn, IsNotEmpty, IsOptional (+2 more)

### Community 113 - "crypto.helper.ts"
Cohesion: 0.24
Nodes (8): TokenBundle, decryptBundle(), encryptBundle(), EncryptedPayload, loadMasterKey(), TokenStorageModule, Module, TOKEN_STORAGE_REPOSITORY

### Community 114 - "OwnerSettingsResponseDto"
Cohesion: 0.28
Nodes (7): OwnerNotificationSettingsDto, ApiProperty, Expose, OwnerSettingsResponseDto, ApiProperty, Expose, Type

### Community 115 - "UpdateAppCategoryDto"
Cohesion: 0.10
Nodes (17): BrandService, Injectable, BrandMemberResponseDto, ApiProperty, BrandResponseDto, ApiProperty, SelectBrandSalonDto, ApiProperty (+9 more)

### Community 116 - "GetTimeSlotsDto"
Cohesion: 0.20
Nodes (9): GetTimeSlotsDto, ApiProperty, ApiPropertyOptional, Expose, IsArray, IsOptional, IsUUID, Matches (+1 more)

### Community 117 - "GetBookableWorkersDto"
Cohesion: 0.20
Nodes (9): GetBookableWorkersDto, ApiPropertyOptional, Expose, IsArray, IsBoolean, IsISO8601, IsOptional, IsUUID (+1 more)

### Community 118 - "CrmSalonDiffService"
Cohesion: 0.15
Nodes (13): Authentication & Authorization, Booking Management, Brand & Salon Management, CRM Integration, Geolocation Search, Key Features, Onboarding, Geo source priority (viewport > center > Geo-IP > none) (+5 more)

### Community 119 - "OwnerServicesListQueryDto"
Cohesion: 0.22
Nodes (9): OwnerServicesListQueryDto, ApiProperty, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min (+1 more)

### Community 120 - "SharedModule"
Cohesion: 0.19
Nodes (10): ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiTags, Controller, Get, Param (+2 more)

### Community 121 - "devDependencies"
Cohesion: 0.22
Nodes (9): concurrently, @nestjs/schematics, @nestjs/testing, devDependencies, concurrently, @nestjs/schematics, @nestjs/testing, typescript (+1 more)

### Community 122 - "ServicesInternalController"
Cohesion: 0.15
Nodes (12): Components, Configuration, Current status, Delivery logic, Enqueueing intents, Extending, Goals, High-level flow (+4 more)

### Community 123 - "AppCategoriesPublicController"
Cohesion: 0.15
Nodes (9): LoggerInterceptor, Injectable, LoggerModule, Global, Module, http, IncomingMessage, RequestCorrelationMiddleware (+1 more)

### Community 124 - "GetBookableDatesDto"
Cohesion: 0.22
Nodes (8): GetBookableDatesDto, ApiPropertyOptional, Expose, IsArray, IsOptional, IsUUID, Matches, Transform

### Community 125 - "GetBookableServicesDto"
Cohesion: 0.22
Nodes (8): GetBookableServicesDto, ApiPropertyOptional, Expose, IsArray, IsISO8601, IsOptional, IsUUID, Transform

### Community 126 - "SalonListQuery"
Cohesion: 0.22
Nodes (7): SalonListQuery, IsInt, IsOptional, IsString, Length, Max, Min

### Community 127 - "logger.module.ts"
Cohesion: 0.17
Nodes (11): API Routes, Beautyn API — Architecture & Features, Core Entities, CRM Entities, Cross-Cutting Concerns, Database, Domain Model, Migration Commands (+3 more)

### Community 128 - "nest-cli.json"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, plugins, $schema, sourceRoot

### Community 129 - "exclude"
Cohesion: 0.25
Nodes (7): dist, node_modules, **/*spec.ts, test, ./tsconfig.json, exclude, extends

### Community 130 - "CrmSyncOrchestratorService"
Cohesion: 0.19
Nodes (4): SalonData, CrmSyncOrchestratorService, Injectable, Optional

### Community 131 - "SubmitSalonFromCrmDto"
Cohesion: 0.25
Nodes (7): SubmitSalonFromCrmDto, ApiPropertyOptional, IsArray, IsBoolean, IsObject, IsOptional, IsString

### Community 132 - "crm-adapter.spec.ts"
Cohesion: 0.25
Nodes (3): CapsStub, ProvStub, SchedStub

### Community 133 - "package.json"
Cohesion: 0.29
Nodes (6): author, description, license, name, private, version

### Community 134 - "SalonSyncDto"
Cohesion: 0.29
Nodes (6): SalonSyncDto, IsEmail, IsNumber, IsOptional, IsString, Length

### Community 135 - "user-settings.service.ts"
Cohesion: 0.22
Nodes (10): API Gateway Pattern, Architecture, Background Workers, Beautyn API (B2B2C salon marketplace backend), Response Envelope, Supabase Auth (JWT guard chain), Sync Reconciliation (Outbox Pattern), IsValidPhone custom validator (+2 more)

### Community 136 - "@prisma/client"
Cohesion: 0.33
Nodes (4): @prisma/client, @prisma/client, main(), main()

### Community 137 - "salons.e2e-spec.ts"
Cohesion: 0.22
Nodes (8): SalonInternalSyncDto, ApiProperty, IsObject, IsOptional, IsUUID, SalonPullDto, ApiProperty, IsUUID

### Community 138 - "search.authenticated.controller.ts"
Cohesion: 0.17
Nodes (11): Compile and run the project, Configuration, CORS, Deployment, Description, License, Project setup, Resources (+3 more)

### Community 139 - "storage.controller.ts"
Cohesion: 0.25
Nodes (9): Local Redis service (redis:7-alpine, port 6380), The 7 BullMQ sync workers (one process per queue), Deterministic jobId overlap protection (sync:<type>:<lane>:<provider>:<salonId>), Change Proposal System (never mutate salon directly), CrmSalonDiffService (field-level CRM change detection), Canonicalize + SHA-256 hash baseline (crm_salon_last_hash), ConflictResolverService (push/pull/noop patch decisions), MergePolicyService (per-field SoT: APP/CRM/AUTO) (+1 more)

### Community 140 - ".sync()"
Cohesion: 0.40
Nodes (8): applyJitter(), calcDelay(), clamp(), sleep(), envBool(), envInt(), executeWithRetry(), RetryOptions

### Community 141 - "category-owner.guard.ts"
Cohesion: 0.21
Nodes (9): AltegioPartnerClient, Injectable, AltegioWebhookService, Injectable, delete(), find(), findUnique(), key() (+1 more)

### Community 142 - "OnboardingProgressDto"
Cohesion: 0.14
Nodes (12): EasyWeekDiscoveryClient, EasyWeekLocation, HttpEasyWeekDiscoveryClient, OnboardingProgressDto, ApiProperty, OnboardingMapper, SalonMapper, delete() (+4 more)

### Community 143 - "salon-owner.guard.ts"
Cohesion: 0.18
Nodes (5): PrismaTokenStorageRepository, Injectable, CrmCredentialRow, TokenStorageRepository, Inject

### Community 144 - "RefreshTokenDto"
Cohesion: 0.18
Nodes (9): SalonImageDto, ApiProperty, Expose, SalonListResponseDto, ApiProperty, Expose, Type, SalonShareDto (+1 more)

### Community 145 - "GetCrmSalonChangesQuery"
Cohesion: 0.18
Nodes (6): ApiCreatedResponse, Post, CreateBrandDto, ApiProperty, IsString, Length

### Community 146 - "UserSettingsService"
Cohesion: 0.28
Nodes (6): ClientSettingsModule, Module, OwnerSettingsModule, Module, Module, UserSettingsModule

### Community 147 - "MemRepo"
Cohesion: 0.25
Nodes (7): CRM Salon Change Detection, How Detection Works, Persistence Schema, Resolution Flow, Testing, Tracked Fields, Usage Entry Points

### Community 148 - "BrandSalonResponseDto"
Cohesion: 0.50
Nodes (3): BrandSalonResponseDto, ApiProperty, ApiPropertyOptional

### Community 149 - "SelectBrandSalonDto"
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

### Community 155 - "MemRepo"
Cohesion: 0.33
Nodes (5): Circuit Breaker, CRM Retry Handler, Environment Defaults, Notes, Quick Start

### Community 156 - "startSalonsSyncWorker()"
Cohesion: 0.29
Nodes (8): SyncDispatchJob, handleSyncDispatch(), log, startCronDiffWorker(), startSalonsSyncWorker(), bootstrap(), runWithRequestContext(), startOutboxWorker()

### Community 157 - "cleanup-local.ts"
Cohesion: 0.29
Nodes (4): prisma, APP_CATEGORIES, HOME_FEED_SECTIONS, SALON_NAMES

### Community 164 - "argon2"
Cohesion: 0.40
Nodes (5): Altegio capability profile (webhooks=true, reschedule=true, maxBatch=200, granularity=5min), EasyWeek capability profile (reschedule=false -> cancel+recreate, maxBatch=100, granularity=10min), CapabilityRegistryService (typed provider capability flags, CRM_CAPS_PATH overrides), CircuitBreaker (CLOSED/OPEN/HALF_OPEN), CRM Shared (framework-agnostic types, CrmError, isRetryable)

### Community 165 - "class-transformer"
Cohesion: 0.40
Nodes (4): Data model changes, EasyWeek widget booking confirmation (MVP), Error handling, Flow

### Community 166 - "class-validator"
Cohesion: 0.40
Nodes (4): API, Env, Provider matrix, Token Storage (AES-256-GCM)

### Community 167 - "concurrently"
Cohesion: 0.50
Nodes (5): Shared Logger (Winston JSON logs, x-request-id correlation), MappingRepository (internal<->external ID mappings), Outbox pattern for durable APP->CRM delivery, Outbox Worker (outbox.processor.ts, consumes crm-outbox), OutboxService (persists intents, queues crm-outbox jobs, jobId=intentId)

### Community 171 - "@eslint/eslintrc"
Cohesion: 0.13
Nodes (12): CrmAdapterModule, Module, CapabilityRegistryModule, Module, SyncSchedulerModule, Module, CrmInternalModule, Module (+4 more)

### Community 172 - "@eslint/js"
Cohesion: 0.38
Nodes (4): HomeFeedSectionResponseDto, ApiProperty, ApiPropertyOptional, UpdateHomeFeedSectionDto

### Community 178 - "libphonenumber-js"
Cohesion: 0.31
Nodes (8): AppCategoriesModule, Module, HomeFeedModule, Module, SavedSalonsModule, Module, SearchModule, Module

### Community 180 - "@nestjs/common"
Cohesion: 0.50
Nodes (3): Account Registry (non-secret CRM config), API, Stored fields

### Community 181 - "@nestjs/config"
Cohesion: 0.50
Nodes (3): Capability Registry, Environment, Example

### Community 182 - "@nestjs/core"
Cohesion: 0.50
Nodes (3): Provider Core, Providers, Responsibilities

### Community 183 - "@nestjs/passport"
Cohesion: 0.50
Nodes (3): Environment Variables, Shared Logger, Usage

### Community 184 - "@nestjs/swagger"
Cohesion: 0.20
Nodes (8): SalonImagesSyncDto, SalonImageSyncItemDto, IsArray, IsInt, IsOptional, IsString, Type, ValidateNested

### Community 188 - "pg"
Cohesion: 0.22
Nodes (9): RegisterDto, ApiProperty, IsEmail, IsIn, IsNotEmpty, IsString, Matches, MaxLength (+1 more)

### Community 189 - "reflect-metadata"
Cohesion: 0.29
Nodes (6): CrmSyncOrchestratorModule, Module, CrmSalonChangesModule, Module, OnboardingModule, Module

### Community 190 - "rxjs"
Cohesion: 0.36
Nodes (9): ListQueryDto, OwnerListQueryDto, ApiProperty, IsInt, IsOptional, IsUUID, Max, Min (+1 more)

### Community 191 - "user-settings.service.ts"
Cohesion: 0.38
Nodes (3): ClientNotificationPatch, OwnerNotificationPatch, RoleSettingsResponse

### Community 192 - "ServicesInternalController"
Cohesion: 0.10
Nodes (19): ServicesInternalController, ApiExcludeController, Body, Controller, HttpCode, Post, UseGuards, ServicesSyncDto (+11 more)

### Community 193 - "UpdateCategoryDto"
Cohesion: 0.20
Nodes (11): CategoryListResponseDto, CategoryResponseDto, ApiProperty, CATEGORY_LIST_MAX_LIMIT, ApiProperty, IsArray, IsInt, IsOptional (+3 more)

### Community 196 - "ProviderContext"
Cohesion: 0.32
Nodes (4): corsOptionsFromConfig(), CorsCheckController, Controller, Get

### Community 200 - "StorageService"
Cohesion: 0.40
Nodes (4): RefreshTokenDto, ApiProperty, IsNotEmpty, IsString

### Community 202 - "create-test-app.ts"
Cohesion: 0.60
Nodes (4): test, buildInternalApp(), buildPublicApp(), withInternalKey()

### Community 203 - "salons.e2e-spec.ts"
Cohesion: 0.67
Nodes (3): CrmServiceDto, CrmServicePageDto, ApiProperty

### Community 206 - "category-owner.guard.ts"
Cohesion: 0.10
Nodes (11): SavedSalonListQueryDto, IsInt, IsOptional, IsString, Max, Min, Type, SavedSalonsRepository (+3 more)

## Knowledge Gaps
- **484 isolated node(s):** `config`, `AnyAccountData`, `Op`, `AltegioBookCategory`, `AltegioBookService` (+479 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **51 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaService` connect `Repositories & EasyWeek Booking` to `CrmSyncOrchestratorService`, `API Gateway Modules`, `Altegio/EasyWeek Provider Records`, `Internal Categories Controllers`, `User Account & Notifications`, `category-owner.guard.ts`, `Booking Handler Service`, `Category Mappings Controllers`, `OnboardingProgressDto`, `Home Feed DTOs`, `Workers Controllers`, `Brand Repository`, `SearchRequestDto`, `BookingQueryService`, `index.ts`, `bookings.owner.controller.ts`, `@eslint/js`, `SearchHistoryService`, `crm-salon-diff.service.ts`, `AppCategoriesRepository`, `@nestjs/swagger`, `WorkersListQuery`, `UpdateCategoryDto`, `create-test-app.ts`, `OwnerSettingsService`, `category-owner.guard.ts`, `shared.module.ts`, `CapabilityRegistryService`, `EasyWeekBooking`, `BookingDto`, `ClientSettingsService`, `ServicesRepository`, `WorkersRepository`, `ServicesSyncDto`, `CreateAltegioRecordDto`, `bookings.internal.controller.ts`, `CreateAppCategoryDto`, `SalonListQuery`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `scripts` connect `NPM Scripts & Build Tooling` to `create-test-app.ts`, `package.json`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Why does `test` connect `create-test-app.ts` to `NPM Scripts & Build Tooling`, `Repositories & EasyWeek Booking`, `Workers Controllers`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `PrismaService` (e.g. with `cleanupTestApp()` and `createTestApp()`) actually correct?**
  _`PrismaService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 77 inferred relationships involving `bootstrap()` (e.g. with `SyncBookingsJobResponseDto` and `SyncBookingsNowResponseDto`) actually correct?**
  _`bootstrap()` has 77 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `AnyAccountData`, `Op` to the rest of the system?**
  _484 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `NPM Scripts & Build Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.02531645569620253 - nodes in this community are weakly interconnected._