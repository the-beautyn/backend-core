# Graph Report - .  (2026-07-15)

## Corpus Check
- Large corpus: 542 files · ~147,208 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3313 nodes · 8066 edges · 216 communities (145 shown, 71 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 128 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

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
- swagger-ui-express
- twilio
- winston
- prettier
- prisma
- source-map-support
- supertest
- ts-jest
- ts-loader
- ts-node
- tsc-alias
- tsconfig-paths
- @types/express
- @types/jest
- @types/jsonwebtoken
- @types/multer
- @types/node
- @types/passport
- @types/passport-jwt
- @types/supertest
- typescript-eslint
- wait-on
- brand.entity.ts
- brand-member.entity.ts

## God Nodes (most connected - your core abstractions)
1. `PrismaService` - 108 edges
2. `CrmType` - 105 edges
3. `scripts` - 80 edges
4. `bootstrap()` - 77 edges
5. `CrmIntegrationService` - 72 edges
6. `BookingHandlerService` - 51 edges
7. `Page` - 46 edges
8. `JwtAuthGuard` - 45 edges
9. `WorkersService` - 38 edges
10. `BookingQueryService` - 37 edges

## Surprising Connections (you probably didn't know these)
- `formatWorkingSchedule()` --indirect_call--> `d()`  [INFERRED]
  libs/crm/provider-core/src/dtos.ts → test/unit/working-schedule.spec.ts
- `cleanupTestApp()` --indirect_call--> `PrismaService`  [INFERRED]
  test-utils/create-test-app.ts → src/shared/database/prisma.service.ts
- `createTestApp()` --indirect_call--> `PrismaService`  [INFERRED]
  test-utils/create-test-app.ts → src/shared/database/prisma.service.ts
- `buildInternalApp()` --indirect_call--> `InternalApiKeyGuard`  [INFERRED]
  test/salon/utils/test-app.salon.ts → src/shared/guards/internal-api-key.guard.ts
- `buildInternalApp()` --indirect_call--> `InternalApiKeyGuard`  [INFERRED]
  test/workers/utils/test-app.workers.ts → src/shared/guards/internal-api-key.guard.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CRM Integration Stack (Adapter -> Provider Core -> Retry/Token/Capability/Account/Scheduler)** — libs_crm_adapter_readme_crmadapter, libs_crm_provider_core_readme_providercore, libs_crm_capability_registry_readme_capabilityregistryservice, libs_crm_retry_handler_readme_executewithretry, libs_crm_token_storage_readme_tokenstorageservice, libs_crm_account_registry_readme_accountregistry, libs_crm_sync_scheduler_readme_syncscheduler [EXTRACTED 1.00]
- **Outbox Delivery Pipeline (durable APP->CRM reconciliation)** — src_sync_reconciliation_readme_outboxservice, src_sync_reconciliation_readme_outboxprocessor, src_sync_reconciliation_readme_mappingrepository, src_sync_reconciliation_readme_shadowstore, src_sync_reconciliation_readme_mergepolicyservice, src_sync_reconciliation_readme_conflictresolverservice [EXTRACTED 1.00]
- **Two-Lane Bookings Poller Flow (cron tick -> dispatch -> per-salon rebase)** — docs_workers_cron_worker, docs_workers_internal_sync_api, docs_workers_bookings_worker, docs_workers_two_lane_bookings_poller, libs_crm_sync_scheduler_readme_syncscheduler [EXTRACTED 1.00]

## Communities (216 total, 71 thin omitted)

### Community 0 - "NPM Scripts & Build Tooling"
Cohesion: 0.03
Nodes (79): scripts, build, build:railway, cleanup:dev, cleanup:local, db:deploy, db:dev:deploy, db:dev:migrate (+71 more)

### Community 1 - "Repositories & EasyWeek Booking"
Cohesion: 0.07
Nodes (20): UpsertMappingInput, BrandWithCount, UpsertInput, AltegioPartnerClient, Injectable, CrmIntegrationService, Injectable, EasyWeekDiscoveryClient (+12 more)

### Community 2 - "Bookings Sync & Auth DTOs"
Cohesion: 0.07
Nodes (49): SyncBookingsJobResponseDto, SyncBookingsNowResponseDto, ApiProperty, LoginResponseDto, ApiProperty, MessageResponseDto, ApiProperty, OAuthResponseDto (+41 more)

### Community 3 - "Categories Sync Controllers"
Cohesion: 0.05
Nodes (51): CategoriesAuthenticatedController, ApiAcceptedResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation (+43 more)

### Community 4 - "API Gateway Modules"
Cohesion: 0.08
Nodes (32): ApiGatewayModule, Module, AuthenticatedApiModule, Module, PublicApiModule, Module, AppModule, Module (+24 more)

### Community 5 - "Sync Reconciliation & Conflict Resolution"
Cohesion: 0.06
Nodes (27): ConflictResolverService, Decision, Injectable, MappingRepository, DEFAULT_POLICY, MergePolicyService, Injectable, clampDuration() (+19 more)

### Community 6 - "Architecture Docs & CRM Concepts"
Cohesion: 0.06
Nodes (54): API Gateway Pattern (Public/Authenticated/Internal layers), Beautyn API (B2B2C salon marketplace backend), CRM Integration Layer (abstract provider pattern), Geolocation Search (viewport/center, radius expansion), Onboarding Flow (CRM connect -> brand -> subscription), Response Envelope ({success, data} wrapper), Supabase Auth (JWT guard chain), Local Redis service (redis:7-alpine, port 6380) (+46 more)

### Community 7 - "Altegio/EasyWeek Provider Records"
Cohesion: 0.07
Nodes (8): AltegioBooking, ListRecordsParams, CategoryData, Page, ServiceData, WorkerData, EasyWeekProvider, ICrmProvider

### Community 8 - "Internal Categories Controllers"
Cohesion: 0.07
Nodes (25): CategoriesInternalController, log, ApiExcludeController, ApiExcludeEndpoint, Body, Controller, HttpCode, Post (+17 more)

### Community 9 - "Workers Sync & UUID Identity"
Cohesion: 0.09
Nodes (23): RFC-4122, uuidV5FromStrings(), Injectable, WorkersCategory, ApiProperty, IsBoolean, IsNotEmpty, IsOptional (+15 more)

### Community 10 - "Public Auth Endpoints & DTOs"
Cohesion: 0.06
Nodes (34): CheckEmailDto, ApiProperty, IsEmail, CheckEmailResponseDto, EmailStatus, ApiProperty, ForgotPasswordDto, ApiProperty (+26 more)

### Community 11 - "CRM Adapter Service"
Cohesion: 0.15
Nodes (4): CrmAdapterService, Injectable, Capability, CrmType

### Community 12 - "User Account & Notifications"
Cohesion: 0.08
Nodes (20): ResetPasswordResponseDto, ApiProperty, NotificationUserDto, ApiProperty, Expose, ApiProperty, ApiPropertyOptional, Expose (+12 more)

### Community 13 - "Onboarding Flow Controller"
Cohesion: 0.09
Nodes (30): OnboardingController, ApiAcceptedResponse, ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse (+22 more)

### Community 14 - "Booking Handler Service"
Cohesion: 0.12
Nodes (3): BookingHandlerService, Injectable, EasyweekBookingDtoNormalized

### Community 15 - "Category Mappings Controllers"
Cohesion: 0.09
Nodes (24): AppCategoryMappingsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller, Get (+16 more)

### Community 16 - "Provider Booking Pullers"
Cohesion: 0.09
Nodes (22): fetchBooking(), listRecords(), mapRecord(), pullBookings(), wait(), fetchBooking(), normalizeBooking(), pullBookings() (+14 more)

### Community 17 - "Altegio Booking Flow Types"
Cohesion: 0.09
Nodes (32): AltegioBookCategory, AltegioBookDatesResponse, AltegioBookService, AltegioBookServicesResponse, AltegioBookStaff, AltegioBookStaffResponse, AltegioBookTime, AltegioBookTimesResponse (+24 more)

### Community 18 - "Search Seed Data & Scripts"
Cohesion: 0.09
Nodes (36): APP_CATEGORIES, HOME_FEED_SECTIONS, SALON_NAMES, backfillSalonSchedules(), buildCatalogRows(), CatalogRows, CATEGORY_IMAGES, CRM_CATEGORY_TO_APP_SLUG (+28 more)

### Community 19 - "Schedule Formatting Utilities"
Cohesion: 0.10
Nodes (21): Day, DAY_NAME, dayHours(), formatWorkingDay(), formatWorkingSchedule(), Hhmm, SalonData, toDotHhmm() (+13 more)

### Community 20 - "Home Feed DTOs"
Cohesion: 0.11
Nodes (21): HomeFeedNextBookingDto, HomeFeedNextBookingServiceDto, ApiProperty, ApiPropertyOptional, HomeFeedResponseDto, ApiProperty, ApiPropertyOptional, HomeFeedSalonCardDto (+13 more)

### Community 21 - "Account Registry & Altegio Provider"
Cohesion: 0.15
Nodes (20): AccountRegistryService, Injectable, Op, BookingData, WorkerSchedule, AvailabilitySlot, CancelBookingInput, CategoryCreateInput (+12 more)

### Community 22 - "Workers Controllers"
Cohesion: 0.10
Nodes (11): ApiExcludeController, Controller, WorkersInternalController, ApiTags, Controller, WorkersController, Injectable, WorkersService (+3 more)

### Community 23 - "Auth Public Controller"
Cohesion: 0.23
Nodes (19): ApiForbiddenResponse, AuthPublicController, ApiAcceptedResponse, ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOkResponse (+11 more)

### Community 24 - "Swagger Decorator Cluster"
Cohesion: 0.09
Nodes (26): ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse (+18 more)

### Community 25 - "Altegio Public Booking DTOs"
Cohesion: 0.15
Nodes (22): SalonContext, BookableDatesResponseDto, ApiProperty, BookableServiceCategoryDto, BookableServiceDto, BookableServicesResponseDto, ApiProperty, BookableWorkerDto (+14 more)

### Community 26 - "Authenticated Client Controllers"
Cohesion: 0.12
Nodes (13): SalonImageDto, ApiProperty, Expose, SavedSalonListResponseDto, SavedSalonToggleResponseDto, ApiProperty, ErrorResponseDto, ApiProperty (+5 more)

### Community 27 - "Brand Repository"
Cohesion: 0.10
Nodes (5): BrandRepository, Injectable, BrandService, Injectable, SalonIncludeOptions

### Community 28 - "Home Feed Section DTOs"
Cohesion: 0.09
Nodes (25): CreateHomeFeedSectionDto, ApiProperty, ApiPropertyOptional, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString (+17 more)

### Community 29 - "Sync Scheduler & Queues"
Cohesion: 0.14
Nodes (11): BullQueueLike, makeQueue(), SyncSchedulerService, Injectable, CronDiffJob, CronDiffJobWithSchedule, SyncJob, log (+3 more)

### Community 30 - "SearchRequestDto"
Cohesion: 0.13
Nodes (21): SearchRequestDto, SearchViewportDto, ApiPropertyOptional, IsArray, IsEnum, IsNumber, IsOptional, IsString (+13 more)

### Community 31 - "BrandController"
Cohesion: 0.17
Nodes (18): Put, BrandController, ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery (+10 more)

### Community 32 - "salons.internal.controller.ts"
Cohesion: 0.11
Nodes (19): SalonsInternalController, ApiExcludeController, Body, Controller, HttpCode, Param, Post, UseGuards (+11 more)

### Community 33 - "BookingQueryService"
Cohesion: 0.16
Nodes (6): BookingQueryService, BookingWithRelations, Injectable, BookingListResponseDto, BookingProviderAltegioDto, BookingProviderEasyweekDto

### Community 34 - "index.ts"
Cohesion: 0.16
Nodes (11): AccountRegistryModule, Module, Inject, PrismaAccountRegistryRepository, Injectable, AccountRegistryRepository, ACCOUNT_REGISTRY_REPOSITORY, AltegioAccount (+3 more)

### Community 35 - "index.ts"
Cohesion: 0.15
Nodes (9): TokenBundle, PrismaTokenStorageRepository, Injectable, CrmCredentialRow, TokenStorageRepository, TokenStorageModule, Module, Inject (+1 more)

### Community 36 - "altegio-webhook.controller.ts"
Cohesion: 0.09
Nodes (19): Res, AltegioWebhookController, ApiExcludeController, Body, Controller, Get, Post, Query (+11 more)

### Community 37 - "bookings.owner.controller.ts"
Cohesion: 0.17
Nodes (12): SalonAccessGuard, Injectable, ServiceResponseDto, ApiProperty, CrmServiceDto, CrmServicePageDto, ApiProperty, InternalApiKeyGuard (+4 more)

### Community 38 - "SavedSalonListQueryDto"
Cohesion: 0.10
Nodes (21): SavedSalonsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Controller, Delete, Get (+13 more)

### Community 39 - "ServicesAuthenticatedController"
Cohesion: 0.18
Nodes (19): ServicesAuthenticatedController, ApiAcceptedResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation (+11 more)

### Community 40 - "ServicesService"
Cohesion: 0.18
Nodes (3): ServiceRecord, ServicesService, Injectable

### Community 41 - "WorkersAuthenticatedController"
Cohesion: 0.18
Nodes (18): ApiAcceptedResponse, ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, Body (+10 more)

### Community 42 - "compilerOptions"
Cohesion: 0.08
Nodes (24): ./tsconfig.base.json, compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames (+16 more)

### Community 43 - "onboarding.controller.ts"
Cohesion: 0.12
Nodes (18): AltegioPairCodeResponseDto, ApiProperty, CrmFieldDto, CrmProviderDto, ApiProperty, CrmProviderListResponseDto, ApiProperty, DiscoverEasyWeekDto (+10 more)

### Community 44 - "SearchHistoryService"
Cohesion: 0.12
Nodes (16): SearchAuthenticatedController, ApiBearerAuth, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Delete (+8 more)

### Community 45 - "PhoneVerificationService"
Cohesion: 0.14
Nodes (9): PhoneVerificationService, Inject, Injectable, Optional, VerificationSession, MockSmsProvider, SMS_PROVIDER, SmsProvider (+1 more)

### Community 47 - ".uploadImage()"
Cohesion: 0.16
Nodes (18): AppCategoriesController, ApiBearerAuth, ApiConsumes, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags (+10 more)

### Community 48 - ".get()"
Cohesion: 0.15
Nodes (15): SalonsController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, Controller (+7 more)

### Community 49 - "crm-salon-diff.service.ts"
Cohesion: 0.15
Nodes (17): buildLocalSnapshot(), LocalSalonSnapshot, PendingOperation, toPrismaJson(), TRACKED_FIELDS, TrackedField, canonicalHash(), canonicalize() (+9 more)

### Community 50 - "onboarding.module.ts"
Cohesion: 0.15
Nodes (14): CapabilityRegistryModule, Module, SyncSchedulerModule, Module, CrmSyncOrchestratorModule, Module, CrmSalonChangesModule, Module (+6 more)

### Community 51 - "brand.controller.ts"
Cohesion: 0.14
Nodes (16): BrandMemberResponseDto, ApiProperty, BrandResponseDto, ApiProperty, CreateBrandDto, ApiProperty, IsString, Length (+8 more)

### Community 52 - "AppCategoriesRepository"
Cohesion: 0.12
Nodes (4): AppCategoriesRepository, Injectable, StorageService, Injectable

### Community 53 - "SavedSalonsService"
Cohesion: 0.11
Nodes (7): SavedSalonItemDto, ApiProperty, ApiPropertyOptional, SavedSalonsRepository, Injectable, SavedSalonsService, Injectable

### Community 54 - "paths"
Cohesion: 0.09
Nodes (21): libs/crm/account-registry/src, libs/crm/adapter/src, libs/crm/capability-registry/src, libs/crm/provider-core/src, libs/crm/retry-handler/src, libs/crm/shared/src, libs/crm/sync-scheduler/src, libs/crm/token-storage/src (+13 more)

### Community 55 - "public-api.module.ts"
Cohesion: 0.12
Nodes (15): HealthController, Controller, Get, AuthModule, Module, PhoneVerificationModule, Module, SyncTriggerService (+7 more)

### Community 56 - "ProviderFactory"
Cohesion: 0.20
Nodes (15): ProviderCoreModule, Module, ProviderFactory, Injectable, bootstrap(), bootstrap(), bootstrap(), envBool() (+7 more)

### Community 57 - "fakes.prisma.workers.ts"
Cohesion: 0.10
Nodes (11): createFakePrismaForSalon(), count(), createFakePrismaForWorkers(), FakePrismaWorkersApi, ServiceRecord, TextContains, update(), WorkerCreateData (+3 more)

### Community 58 - "createChildLogger()"
Cohesion: 0.15
Nodes (9): notImplemented(), als, getRequestId(), RequestContext, baseLogger, createChildLogger(), LoggerLike, LogLevel (+1 more)

### Community 59 - "OwnerBookingsController"
Cohesion: 0.18
Nodes (13): OwnerBookingsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller, Get (+5 more)

### Community 60 - "HomeFeedSectionsAdminController"
Cohesion: 0.13
Nodes (16): HomeFeedSectionsAdminController, ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags, Body (+8 more)

### Community 61 - "HomeFeedSectionConfigRepository"
Cohesion: 0.14
Nodes (4): HomeFeedSectionConfigRepository, Injectable, HomeFeedSectionConfigService, Injectable

### Community 62 - "ServicesListQuery"
Cohesion: 0.10
Nodes (17): ServicesController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Query (+9 more)

### Community 63 - "WorkersListQuery"
Cohesion: 0.12
Nodes (16): ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, Get, Param, Query, ApiProperty (+8 more)

### Community 64 - "authenticated-api.module.ts"
Cohesion: 0.21
Nodes (12): AppCategoriesModule, Module, BrandModule, Module, CategoriesModule, Module, HomeFeedModule, Module (+4 more)

### Community 65 - ".getHomeFeed()"
Cohesion: 0.11
Nodes (16): HomeFeedController, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Query, Req (+8 more)

### Community 66 - "SearchService"
Cohesion: 0.19
Nodes (4): GeoLocationService, Injectable, SearchService, Injectable

### Community 67 - "UpdateUserDto"
Cohesion: 0.15
Nodes (14): ALLOWED_AVATAR_DOMAINS, IsAllowedAvatarDomain(), TestDto, IsValidPhone(), TestDto, IsEnum, IsISO8601, IsOptional (+6 more)

### Community 68 - "crm-internal.controller.ts"
Cohesion: 0.14
Nodes (11): CrmAdapterModule, Module, CrmInternalController, ApiExcludeController, Controller, UseGuards, CrmInternalModule, Module (+3 more)

### Community 69 - "ClientBookingsController"
Cohesion: 0.18
Nodes (12): ClientBookingsController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Param (+4 more)

### Community 70 - "CrmSalonChangesController"
Cohesion: 0.21
Nodes (13): CrmSalonChangesController, ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Controller, Get (+5 more)

### Community 71 - ".confirm()"
Cohesion: 0.12
Nodes (14): EasyweekBookingAuthenticatedController, ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller (+6 more)

### Community 72 - ".upload()"
Cohesion: 0.14
Nodes (14): StorageController, ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiOperation, ApiTags, Controller, Delete (+6 more)

### Community 73 - "app-categories.service.ts"
Cohesion: 0.22
Nodes (9): AppCategoriesService, MIME_TO_EXT, Injectable, AppCategoryListResponseDto, ApiProperty, AppCategoryResponseDto, ApiProperty, APP_CATEGORY_MAX_LIMIT (+1 more)

### Community 76 - "OwnerSettingsService"
Cohesion: 0.19
Nodes (7): OwnerSettingsModule, Module, OwnerSettingsRepository, Injectable, OwnerNotificationPatch, OwnerSettingsService, Injectable

### Community 77 - "Lane"
Cohesion: 0.16
Nodes (11): Lane, SyncInternalController, ApiExcludeController, Body, Controller, HttpCode, Post, UseGuards (+3 more)

### Community 78 - "salons.authenticated.controller.ts"
Cohesion: 0.21
Nodes (9): SyncSalonJobResponseDto, ApiProperty, CrmSalonChangeDto, ApiProperty, CrmSalonChangeMapper, HomeFeedSectionResponseDto, ApiProperty, ApiPropertyOptional (+1 more)

### Community 79 - ".updateNotifications()"
Cohesion: 0.16
Nodes (13): ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse, Body, Controller (+5 more)

### Community 80 - ".searchPins()"
Cohesion: 0.21
Nodes (12): SearchPublicController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, Body, Controller, Get (+4 more)

### Community 81 - "SendOtpDto"
Cohesion: 0.15
Nodes (12): SendOtpDto, ApiProperty, IsString, Matches, Transform, ApiProperty, IsString, Length (+4 more)

### Community 82 - "shared.module.ts"
Cohesion: 0.16
Nodes (6): Catch, EnvelopeExceptionFilter, AppConfigService, Injectable, HashService, Injectable

### Community 83 - "CapabilityRegistryService"
Cohesion: 0.23
Nodes (8): CapabilityRegistryService, deepMerge(), isRecord(), loadDefaultMapWithCandidates(), loadJson(), loadOverride(), Injectable, CapabilityMap

### Community 84 - "EasyWeekBooking"
Cohesion: 0.23
Nodes (12): EasyWeekBooking, AltegioBookingPayload, AltegioBookingsSyncDto, EasyweekBookingPayload, EasyweekBookingsSyncDto, ApiProperty, IsArray, IsOptional (+4 more)

### Community 85 - "internal-api.module.ts"
Cohesion: 0.27
Nodes (10): InternalApiModule, Module, AltegioBookingModule, Module, BookingModule, Module, EasyweekBookingModule, Module (+2 more)

### Community 86 - "search.service.ts"
Cohesion: 0.30
Nodes (9): FilterOptionsResultDto, ApiProperty, SearchPinDto, SearchPinsResultDto, SearchResponseDto, SearchResultDto, ApiProperty, ApiPropertyOptional (+1 more)

### Community 88 - "ClientSettingsResponseDto"
Cohesion: 0.18
Nodes (7): ClientNotificationSettingsDto, ApiProperty, Expose, ClientSettingsResponseDto, ApiProperty, Expose, Type

### Community 89 - "SearchQueryBuilderService"
Cohesion: 0.25
Nodes (3): ResolvedGeoContext, SearchQueryBuilderService, Injectable

### Community 90 - "runWithRequestContext()"
Cohesion: 0.19
Nodes (10): SyncDispatchJob, handleSyncDispatch(), log, startCronDiffWorker(), runWithRequestContext(), http, IncomingMessage, RequestCorrelationMiddleware (+2 more)

### Community 91 - ".create()"
Cohesion: 0.14
Nodes (12): AltegioBookingAuthenticatedController, ApiBadRequestResponse, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Body, Controller (+4 more)

### Community 92 - "BookingDto"
Cohesion: 0.30
Nodes (8): BookingsInternalController, ApiExcludeController, Body, Controller, HttpCode, Post, UseGuards, BookingDto

### Community 93 - "AltegioBookingPublicController"
Cohesion: 0.34
Nodes (9): AltegioBookingPublicController, ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Param (+1 more)

### Community 94 - "SkipResponseTransform()"
Cohesion: 0.19
Nodes (9): AuthResetController, Controller, Get, Header, Controller, Get, Header, WellKnownController (+1 more)

### Community 95 - "ClientSettingsService"
Cohesion: 0.21
Nodes (7): ClientSettingsModule, Module, ClientSettingsRepository, Injectable, ClientNotificationPatch, ClientSettingsService, Injectable

### Community 98 - "CircuitBreaker"
Cohesion: 0.27
Nodes (4): BreakerOpenError, CircuitBreaker, BreakerState, CircuitBreakerOptions

### Community 99 - "ListAppCategoriesQueryDto"
Cohesion: 0.21
Nodes (10): ListAppCategoriesQueryDto, ApiProperty, IsBoolean, IsInt, IsOptional, Max, Min, Type (+2 more)

### Community 100 - "SalonService"
Cohesion: 0.19
Nodes (7): SalonInternalSyncDto, ApiProperty, IsObject, IsOptional, IsUUID, SalonService, Injectable

### Community 101 - "ServicesSyncDto"
Cohesion: 0.17
Nodes (12): ServicesSyncDto, ServicesSyncServiceDto, ApiProperty, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional (+4 more)

### Community 102 - "CreateAltegioRecordDto"
Cohesion: 0.17
Nodes (11): ArrayMaxSize, ArrayMinSize, CreateAltegioRecordDto, ApiProperty, ApiPropertyOptional, IsArray, IsISO8601, IsOptional (+3 more)

### Community 103 - "initialSync.processor.ts"
Cohesion: 0.33
Nodes (9): deriveFirstName(), deriveLastName(), resolveNamePart(), splitName(), log, startInitialSyncWorker(), toWorkerPayload(), log (+1 more)

### Community 104 - "SalonsAuthenticatedController"
Cohesion: 0.26
Nodes (9): SalonsAuthenticatedController, ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags, Controller, Param, Post (+1 more)

### Community 105 - "bookings.internal.controller.ts"
Cohesion: 0.18
Nodes (8): BookingsRebaseDto, ApiProperty, ApiPropertyOptional, IsIn, IsOptional, IsUUID, EasyweekBookingService, Injectable

### Community 106 - "CreateAppCategoryDto"
Cohesion: 0.18
Nodes (9): CreateAppCategoryDto, ApiProperty, IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, Length (+1 more)

### Community 107 - "CreateServiceDto"
Cohesion: 0.17
Nodes (11): CreateServiceDto, ApiProperty, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString (+3 more)

### Community 108 - "UpdateServiceDto"
Cohesion: 0.17
Nodes (11): ApiProperty, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID (+3 more)

### Community 109 - "dependencies"
Cohesion: 0.18
Nodes (11): bullmq, jose, @nestjs/jwt, @nestjs/platform-express, dependencies, bullmq, jose, @nestjs/jwt (+3 more)

### Community 110 - "executeWithRetry()"
Cohesion: 0.40
Nodes (8): applyJitter(), calcDelay(), clamp(), sleep(), envBool(), envInt(), executeWithRetry(), RetryOptions

### Community 111 - "categories.controller.ts"
Cohesion: 0.40
Nodes (8): CategoriesSyncJobResponseDto, CategoriesSyncResultDto, CrmCategoryDto, CrmCategoryPageDto, ApiProperty, CategoryListResponseDto, CategoryResponseDto, ApiProperty

### Community 112 - "OAuthSignInDto"
Cohesion: 0.18
Nodes (10): OAUTH_PROVIDERS, OAuthProvider, OAuthSignInDto, ApiProperty, ApiPropertyOptional, IsIn, IsNotEmpty, IsOptional (+2 more)

### Community 113 - "crypto.helper.ts"
Cohesion: 0.24
Nodes (4): decryptBundle(), encryptBundle(), EncryptedPayload, loadMasterKey()

### Community 114 - "OwnerSettingsResponseDto"
Cohesion: 0.24
Nodes (8): settingsOneOf(), OwnerNotificationSettingsDto, ApiProperty, Expose, OwnerSettingsResponseDto, ApiProperty, Expose, Type

### Community 115 - "UpdateAppCategoryDto"
Cohesion: 0.22
Nodes (8): ApiProperty, IsArray, IsBoolean, IsOptional, IsString, Length, Matches, UpdateAppCategoryDto

### Community 116 - "GetTimeSlotsDto"
Cohesion: 0.20
Nodes (9): GetTimeSlotsDto, ApiProperty, ApiPropertyOptional, Expose, IsArray, IsOptional, IsUUID, Matches (+1 more)

### Community 117 - "GetBookableWorkersDto"
Cohesion: 0.20
Nodes (9): GetBookableWorkersDto, ApiPropertyOptional, Expose, IsArray, IsBoolean, IsISO8601, IsOptional, IsUUID (+1 more)

### Community 118 - "CrmSalonDiffService"
Cohesion: 0.27
Nodes (3): applyFieldPatch(), CrmSalonDiffService, Injectable

### Community 119 - "OwnerServicesListQueryDto"
Cohesion: 0.20
Nodes (9): OwnerServicesListQueryDto, ApiProperty, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min (+1 more)

### Community 120 - "SharedModule"
Cohesion: 0.31
Nodes (8): SharedModule, Global, Module, cleanupTestApp(), cleanupTestData(), createTestApp(), setupTestEnvironment(), TEST_CONFIG

### Community 121 - "devDependencies"
Cohesion: 0.22
Nodes (9): dotenv-cli, @nestjs/schematics, @nestjs/testing, devDependencies, dotenv-cli, @nestjs/schematics, @nestjs/testing, typescript (+1 more)

### Community 122 - "ServicesInternalController"
Cohesion: 0.22
Nodes (7): ServicesInternalController, ApiExcludeController, Body, Controller, HttpCode, Post, UseGuards

### Community 123 - "AppCategoriesPublicController"
Cohesion: 0.22
Nodes (7): AppCategoriesPublicController, ApiOkResponse, ApiOperation, ApiTags, Controller, Get, Query

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
Cohesion: 0.29
Nodes (5): LoggerInterceptor, Injectable, LoggerModule, Global, Module

### Community 128 - "nest-cli.json"
Cohesion: 0.25
Nodes (7): collection, compilerOptions, assets, deleteOutDir, plugins, $schema, sourceRoot

### Community 129 - "exclude"
Cohesion: 0.25
Nodes (7): dist, node_modules, **/*spec.ts, test, ./tsconfig.json, exclude, extends

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
Cohesion: 0.33
Nodes (5): ApiPropertyOptional, IsBoolean, IsOptional, UpdateNotificationSettingsDto, RoleSettingsResponse

### Community 136 - "@prisma/client"
Cohesion: 0.33
Nodes (4): @prisma/client, @prisma/client, main(), main()

### Community 137 - "salons.e2e-spec.ts"
Cohesion: 0.60
Nodes (4): test, buildInternalApp(), buildPublicApp(), withInternalKey()

### Community 138 - "search.authenticated.controller.ts"
Cohesion: 0.53
Nodes (3): SearchHistoryItemDto, ApiProperty, ApiPropertyOptional

### Community 139 - "storage.controller.ts"
Cohesion: 0.40
Nodes (3): MIME_TO_EXT, StorageUploadResponseDto, ApiProperty

### Community 140 - ".sync()"
Cohesion: 0.33
Nodes (5): ApiExcludeEndpoint, Body, HttpCode, Post, UseGuards

### Community 141 - "category-owner.guard.ts"
Cohesion: 0.33
Nodes (3): CategoryOwnerGuard, CategoryRequest, Injectable

### Community 143 - "salon-owner.guard.ts"
Cohesion: 0.33
Nodes (3): SalonOwnerGuard, SalonOwnerRequest, Injectable

### Community 144 - "RefreshTokenDto"
Cohesion: 0.40
Nodes (4): RefreshTokenDto, ApiProperty, IsNotEmpty, IsString

### Community 145 - "GetCrmSalonChangesQuery"
Cohesion: 0.40
Nodes (4): GetCrmSalonChangesQuery, IsEnum, IsOptional, IsUUID

### Community 148 - "BrandSalonResponseDto"
Cohesion: 0.50
Nodes (3): BrandSalonResponseDto, ApiProperty, ApiPropertyOptional

### Community 149 - "SelectBrandSalonDto"
Cohesion: 0.50
Nodes (3): SelectBrandSalonDto, ApiProperty, IsUUID

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

## Knowledge Gaps
- **316 isolated node(s):** `config`, `AnyAccountData`, `Op`, `AltegioBookCategory`, `AltegioBookService` (+311 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **71 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PrismaService` connect `Repositories & EasyWeek Booking` to `API Gateway Modules`, `Internal Categories Controllers`, `Workers Sync & UUID Identity`, `search.authenticated.controller.ts`, `salons.e2e-spec.ts`, `User Account & Notifications`, `category-owner.guard.ts`, `Booking Handler Service`, `Category Mappings Controllers`, `Provider Booking Pullers`, `salon-owner.guard.ts`, `Home Feed DTOs`, `Workers Controllers`, `Altegio Public Booking DTOs`, `Brand Repository`, `Home Feed Section DTOs`, `SearchRequestDto`, `salons.internal.controller.ts`, `BookingQueryService`, `bookings.owner.controller.ts`, `SearchHistoryService`, `crm-salon-diff.service.ts`, `AppCategoriesRepository`, `SavedSalonsService`, `HomeFeedSectionConfigRepository`, `OwnerSettingsService`, `shared.module.ts`, `SearchQueryBuilderService`, `ClientSettingsService`, `ServicesRepository`, `WorkersRepository`, `CreateAppCategoryDto`, `CrmSalonDiffService`, `SharedModule`, `SalonListQuery`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Why does `scripts` connect `NPM Scripts & Build Tooling` to `salons.e2e-spec.ts`, `package.json`?**
  _High betweenness centrality (0.095) - this node is a cross-community bridge._
- **Why does `test` connect `salons.e2e-spec.ts` to `NPM Scripts & Build Tooling`, `SharedModule`, `Workers Controllers`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `PrismaService` (e.g. with `cleanupTestApp()` and `createTestApp()`) actually correct?**
  _`PrismaService` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 76 inferred relationships involving `bootstrap()` (e.g. with `SyncBookingsJobResponseDto` and `SyncBookingsNowResponseDto`) actually correct?**
  _`bootstrap()` has 76 INFERRED edges - model-reasoned connections that need verification._
- **What connects `config`, `AnyAccountData`, `Op` to the rest of the system?**
  _316 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `NPM Scripts & Build Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.02531645569620253 - nodes in this community are weakly interconnected._