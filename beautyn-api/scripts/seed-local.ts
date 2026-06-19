import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { encryptBundle, decryptBundle } from '@crm/token-storage/crypto.helper';
import type { TokenBundle } from '@crm/shared';
import { APP_CATEGORIES, HOME_FEED_SECTIONS, SALON_NAMES, SEARCH_SEED_PREFIX } from './search-seed-constants';

const prisma = new PrismaClient();
const verbose = process.argv.includes('--verbose');

const SALON_COUNT = 200;
const BASE_LAT = 50.4501;
const BASE_LNG = 30.5234;

// Owners whose real CRM-connected salons act as anchors: seeded salons are
// randomly assigned to one of these so they belong to a real CRM owner/brand.
const CRM_OWNER_EMAILS = ['altegio@example.com', 'easyweek@example.com'];

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';

const SALON_IMAGES = [
  `${SUPABASE_URL}/storage/v1/object/public/dump/865c5717-29b8-42f9-bc19-0fb75c3abae1.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/dump/0d1d69f6-23ee-42ad-945a-0a18bd49651c.jpg`,
  `${SUPABASE_URL}/storage/v1/object/public/dump/8633744a-d876-4d1c-91a8-7fe43efc6556.jpg`,
];

const CATEGORY_IMAGES = [
  `${SUPABASE_URL}/storage/v1/object/public/dump/4b862e59-a3ac-4482-b16a-e6e26ccaac49.png`,
  `${SUPABASE_URL}/storage/v1/object/public/dump/e449d225-70f3-42ca-8d82-1f7ce4665b01.png`,
  `${SUPABASE_URL}/storage/v1/object/public/dump/59a4aba3-02a9-477a-ab6a-809aef4058a3.png`,
];

// Curated mapping from a real CRM category name (lowercased) to an app-category
// slug. The CRM category names are English and don't auto-match the Ukrainian
// app-category taxonomy, so we map them explicitly to keep cloned seed salons
// searchable. Names with no sensible app-category (e.g. "Test1 Category") are
// omitted on purpose — their cloned categories stay unmapped.
const CRM_CATEGORY_TO_APP_SLUG: Record<string, string> = {
  'facial care': 'face',
  'hair care': 'hair',
  'nails care': 'nails',
  manicure: 'nails',
  pedicure: 'nails',
  brows: 'brow',
  eyelashes: 'brow',
  'trichology & aesthetics': 'trichology',
};

function randomOffset(radiusKm = 5): { lat: number; lng: number } {
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((BASE_LAT * Math.PI) / 180);
  const deltaKmLat = (Math.random() * 2 - 1) * radiusKm;
  const deltaKmLng = (Math.random() * 2 - 1) * radiusKm;
  return {
    lat: BASE_LAT + deltaKmLat / kmPerDegLat,
    lng: BASE_LNG + deltaKmLng / kmPerDegLng,
  };
}

function randomPrice(): { min: number; max: number } {
  const min = 2000 + Math.floor(Math.random() * 8000);
  const max = min + 2000 + Math.floor(Math.random() * 8000);
  return { min, max };
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  return arr.slice().sort(() => Math.random() - 0.5);
}

// Returns a gallery of 0–3 distinct salon images (uniform random count).
function randomGalleryImages(): string[] {
  const count = Math.floor(Math.random() * 4); // 0, 1, 2 or 3
  return shuffle(SALON_IMAGES).slice(0, count);
}

// Generates a weekday/weekend split so consecutive days share hours and the
// schedule collapses into a clean one-liner (e.g. "Mon–Fri 10:00–19:00 ·
// Sat–Sun 09:00–18:00"). day index 0..6 = Sun..Sat (openHoursJson `day` field).
function randomOpenHours() {
  const weekdayStart = 9 + Math.floor(Math.random() * 2); // 09 or 10
  const weekdayEnd = 19 + Math.floor(Math.random() * 2); // 19 or 20
  const weekendStart = 9 + Math.floor(Math.random() * 2); // 09 or 10
  const weekendEnd = 17 + Math.floor(Math.random() * 2); // 17 or 18
  const hhmm = (h: number) => `${String(h).padStart(2, '0')}:00`;
  return Array.from({ length: 7 }).map((_, day) => {
    const isWeekend = day === 0 || day === 6; // Sun or Sat
    return {
      day,
      periods: [
        {
          start: hhmm(isWeekend ? weekendStart : weekdayStart),
          end: hhmm(isWeekend ? weekendEnd : weekdayEnd),
        },
      ],
    };
  });
}

// Day abbreviation by openHoursJson `day` field (0=Sun..6=Sat).
const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
// `day` field values in display order (Mon..Sun); index = rank for adjacency.
const DAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

// Collapses openHoursJson into a single line, grouping consecutive days that
// share the same hours, e.g. "Mon–Fri 10:00–19:00 · Sat–Sun 09:00–18:00".
function formatScheduleFromOpenHours(openHours: ReturnType<typeof randomOpenHours>): string {
  const byDay = new Map<number, (typeof openHours)[number]>();
  for (const entry of openHours) byDay.set(entry.day, entry);

  type Group = { startDay: number; endDay: number; endRank: number; hours: string };
  const groups: Group[] = [];

  DAY_DISPLAY_ORDER.forEach((day, rank) => {
    const period = byDay.get(day)?.periods?.[0];
    if (!period) return;
    const hours = `${period.start}–${period.end}`;
    const last = groups[groups.length - 1];
    if (last && last.hours === hours && last.endRank === rank - 1) {
      last.endDay = day;
      last.endRank = rank;
    } else {
      groups.push({ startDay: day, endDay: day, endRank: rank, hours });
    }
  });

  return groups
    .map((g) => {
      const days =
        g.startDay === g.endDay
          ? DAY_ABBREV[g.startDay]
          : `${DAY_ABBREV[g.startDay]}–${DAY_ABBREV[g.endDay]}`;
      return `${days} ${g.hours}`;
    })
    .join(' · ');
}

async function seedAppCategories(): Promise<Record<string, string>> {
  console.log('Seeding app categories...');
  const slugToId: Record<string, string> = {};

  for (let i = 0; i < APP_CATEGORIES.length; i++) {
    const cat = APP_CATEGORIES[i];
    const existing = await prisma.appCategory.findFirst({ where: { slug: cat.slug } });
    const payload = {
      slug: cat.slug,
      name: cat.name,
      keywords: cat.keywords,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      imageUrl: CATEGORY_IMAGES[i % CATEGORY_IMAGES.length],
    };
    const isUpdate = !!existing;
    const record = isUpdate
      ? await prisma.appCategory.update({ where: { id: existing.id }, data: payload })
      : await prisma.appCategory.create({ data: payload });
    slugToId[cat.slug] = record.id;
    if (verbose) console.log(`    [${i + 1}/${APP_CATEGORIES.length}] ${isUpdate ? 'updated' : 'created'} "${cat.name}" (${cat.slug})`);
  }

  console.log(`  ${APP_CATEGORIES.length} app categories upserted`);
  return slugToId;
}

// Builds the slug→id map from already-seeded app categories, so steps that
// depend on it (mappings, sections) can run without re-seeding categories.
async function loadSlugToId(): Promise<Record<string, string>> {
  const cats = await prisma.appCategory.findMany({ select: { slug: true, id: true } });
  return Object.fromEntries(cats.map((c) => [c.slug, c.id]));
}

async function seedSalons(): Promise<void> {
  console.log('Seeding salons...');

  const existingCount = await prisma.salon.count({
    where: { name: { startsWith: SEARCH_SEED_PREFIX } },
  });
  if (existingCount > 0) {
    console.log(`  ${existingCount} seed salons already exist — skipping creation`);
    await backfillSalonSchedules();
    return;
  }

  const salons: Prisma.SalonCreateManyInput[] = [];
  const salonImages: Prisma.SalonImageCreateManyInput[] = [];

  Array.from({ length: SALON_COUNT }).forEach((_, idx) => {
    const id = randomUUID();
    const { lat, lng } = randomOffset();
    const rating = Math.round((Math.random() * 2 + 3) * 10) / 10;
    const ratingCount = Math.floor(Math.random() * 500);
    const prices = randomPrice();
    const baseName = SALON_NAMES[idx % SALON_NAMES.length];
    const openHours = randomOpenHours();
    const gallery = randomGalleryImages();

    salons.push({
      id,
      name: `${SEARCH_SEED_PREFIX} ${baseName} #${idx + 1}`,
      city: 'Kyiv',
      country: 'UA',
      addressLine: `Test Street ${idx + 1}`,
      latitude: new Prisma.Decimal(lat.toFixed(6)),
      longitude: new Prisma.Decimal(lng.toFixed(6)),
      ratingAvg: new Prisma.Decimal(rating.toFixed(1)),
      ratingCount,
      minPriceCents: prices.min,
      maxPriceCents: prices.max,
      openHoursJson: openHours as any,
      workingSchedule: formatScheduleFromOpenHours(openHours),
      coverImageUrl: SALON_IMAGES[idx % SALON_IMAGES.length],
      imagesCount: gallery.length,
    });

    gallery.forEach((imageUrl, sortOrder) => {
      salonImages.push({ salonId: id, imageUrl, sortOrder });
    });
  });

  if (verbose) {
    let created = 0;
    for (let i = 0; i < salons.length; i++) {
      await prisma.salon.create({ data: salons[i] });
      created++;
      const count = salons[i].imagesCount ?? 0;
      console.log(`    [${created}/${SALON_COUNT}] created "${salons[i].name}" (${count} images)`);
    }
    console.log(`  ${created} salons created`);
  } else {
    const result = await prisma.salon.createMany({ data: salons, skipDuplicates: true });
    console.log(`  ${result.count} salons created`);
  }

  if (salonImages.length > 0) {
    const imgResult = await prisma.salonImage.createMany({ data: salonImages, skipDuplicates: true });
    console.log(`  ${imgResult.count} salon images created across ${SALON_COUNT} salons`);
  }
}

// Re-derives a one-line workingSchedule for seeded salons that are missing it
// or still hold the old multi-line format (a `\n` in the string). Regenerates
// openHoursJson with the groupable weekday/weekend pattern so the one-liner
// collapses cleanly. Salons already on the one-line format are left untouched.
async function backfillSalonSchedules(): Promise<void> {
  const stale = await prisma.salon.findMany({
    where: {
      name: { startsWith: SEARCH_SEED_PREFIX },
      OR: [{ workingSchedule: null }, { workingSchedule: { contains: '\n' } }],
    },
    select: { id: true },
  });
  if (stale.length === 0) {
    console.log('  All seed salons already have a one-line working schedule — nothing to backfill');
    return;
  }
  for (const salon of stale) {
    const openHours = randomOpenHours();
    await prisma.salon.update({
      where: { id: salon.id },
      data: {
        openHoursJson: openHours as any,
        workingSchedule: formatScheduleFromOpenHours(openHours),
      },
    });
  }
  console.log(`  Backfilled one-line workingSchedule for ${stale.length} salons`);
}

// A clone-ready snapshot of the real CRM salon's catalog (categories, services,
// workers and the links between them), copied verbatim onto every seed salon of
// this provider.
type CrmCatalogCategory = {
  id: string;
  crmCategoryId: string;
  name: string;
  color: string | null;
  sortOrder: number | null;
};
type CrmCatalogWorker = {
  id: string;
  crmWorkerId: string | null;
  firstName: string;
  lastName: string;
  position: string | null;
  role: string | null;
  description: string | null;
  photoUrl: string | null;
  workingSchedule: Prisma.JsonValue;
  isActive: boolean;
};
type CrmCatalogService = {
  id: string;
  crmServiceId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  currency: string;
  sortOrder: number | null;
  isActive: boolean;
};
type CrmCatalogLink = { serviceId: string; workerId: string | null; remoteWorkerId: string | null };

// Anchor a seed salon to a real CRM salon: which provider it's linked to, the
// owner/brand that owns it, the Account Registry payload + decrypted CRM token
// needed to make live booking calls resolve to the real company, the EasyWeek
// widget URL, and the real catalog we replicate onto each seed salon.
type CrmAnchor = {
  email: string;
  provider: string;
  ownerUserId: string;
  brandId: string | null;
  accountData: Prisma.JsonValue;
  token: TokenBundle;
  bookingUrl: string | null;
  timezone: string | null;
  categories: CrmCatalogCategory[];
  workers: CrmCatalogWorker[];
  services: CrmCatalogService[];
  links: CrmCatalogLink[];
};

// Builds (without touching the DB) the cloned inner-catalog rows for one seed
// ("dump") salon: a verbatim copy of the real CRM salon's categories, services,
// workers and their links, plus curated app-category mappings so the salon stays
// searchable. Worker email/phone are dropped (they're globally unique and the
// real ones are null anyway). Returning plain rows lets the caller batch-insert
// every salon's catalog in a handful of createMany calls instead of per-salon
// round-trips — a big win against a remote DB.
type CatalogRows = {
  categories: Prisma.CategoryCreateManyInput[];
  services: Prisma.ServiceCreateManyInput[];
  workers: Prisma.WorkerCreateManyInput[];
  links: Prisma.WorkerServiceCreateManyInput[];
  mappings: Prisma.SalonCategoryMappingCreateManyInput[];
};

function buildCatalogRows(
  dumpSalonId: string,
  anchor: CrmAnchor,
  slugToId: Record<string, string>,
): CatalogRows {
  // Pre-generate cloned ids so services/links/mappings can reference them without
  // a DB round-trip, and so each category can carry its denormalized serviceIds.
  const categoryIdMap = new Map<string, string>();
  for (const c of anchor.categories) categoryIdMap.set(c.id, randomUUID());

  const serviceIdMap = new Map<string, string>();
  const serviceIdsByCategory = new Map<string, string[]>();
  for (const s of anchor.services) {
    const id = randomUUID();
    serviceIdMap.set(s.id, id);
    const newCatId = s.categoryId ? categoryIdMap.get(s.categoryId) : undefined;
    if (newCatId) {
      const arr = serviceIdsByCategory.get(newCatId) ?? [];
      arr.push(id);
      serviceIdsByCategory.set(newCatId, arr);
    }
  }

  const workerIdMap = new Map<string, string>();
  for (const w of anchor.workers) workerIdMap.set(w.id, randomUUID());

  const categories: Prisma.CategoryCreateManyInput[] = anchor.categories.map((c) => {
    const id = categoryIdMap.get(c.id)!;
    return {
      id,
      salonId: dumpSalonId,
      crmCategoryId: c.crmCategoryId,
      name: c.name,
      color: c.color,
      sortOrder: c.sortOrder,
      serviceIds: serviceIdsByCategory.get(id) ?? [],
    };
  });

  const services: Prisma.ServiceCreateManyInput[] = anchor.services.map((s) => ({
    id: serviceIdMap.get(s.id)!,
    salonId: dumpSalonId,
    crmServiceId: s.crmServiceId,
    categoryId: s.categoryId ? categoryIdMap.get(s.categoryId) ?? null : null,
    name: s.name,
    description: s.description,
    duration: s.duration,
    price: s.price,
    currency: s.currency,
    sortOrder: s.sortOrder,
    isActive: s.isActive,
  }));

  const workers: Prisma.WorkerCreateManyInput[] = anchor.workers.map((w) => ({
    id: workerIdMap.get(w.id)!,
    salonId: dumpSalonId,
    crmWorkerId: w.crmWorkerId,
    firstName: w.firstName,
    lastName: w.lastName,
    position: w.position,
    role: w.role,
    description: w.description,
    photoUrl: w.photoUrl,
    workingSchedule: w.workingSchedule === null ? Prisma.DbNull : (w.workingSchedule as Prisma.InputJsonValue),
    isActive: w.isActive,
  }));

  const links: Prisma.WorkerServiceCreateManyInput[] = [];
  for (const l of anchor.links) {
    const serviceId = serviceIdMap.get(l.serviceId);
    if (!serviceId) continue;
    links.push({
      serviceId,
      workerId: l.workerId ? workerIdMap.get(l.workerId) ?? null : null,
      remoteWorkerId: l.remoteWorkerId,
    });
  }

  // Curated mapping (CRM names don't auto-match the taxonomy) so the salon
  // appears in category search & home-feed.
  const mappings: Prisma.SalonCategoryMappingCreateManyInput[] = [];
  for (const c of anchor.categories) {
    const slug = CRM_CATEGORY_TO_APP_SLUG[c.name.trim().toLowerCase()];
    const appCategoryId = slug ? slugToId[slug] : undefined;
    const salonCategoryId = categoryIdMap.get(c.id);
    if (!appCategoryId || !salonCategoryId) continue;
    mappings.push({ salonCategoryId, appCategoryId, autoMatched: true });
  }

  return { categories, services, workers, links, mappings };
}

// Inserts rows in chunks to stay well under Postgres' bind-parameter limit on
// large createMany calls.
async function insertChunked<T>(
  rows: T[],
  insert: (batch: T[]) => Promise<unknown>,
  size = 1000,
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await insert(rows.slice(i, i + size));
  }
}

// Randomly connects each seed salon to one of the CRM owners' salons: it sets the
// salon's CRM identity, clones that CRM salon's whole inner catalog onto it (so
// all seed salons of a provider share identical categories/services/workers), and
// derives the salon's price range from the cloned services.
//
// CRM identity = its own Account Registry row (same externalSalonId/locationId)
// plus a CrmCredential. The credential token is AAD-bound to `${salonId}:${provider}`,
// so we decrypt the real token and re-encrypt it under the seed salon's own id
// rather than copying ciphertext. The salon's own externalSalonId is left null on
// purpose — the adapter reads the id from the registry, and a null keeps these
// fixtures out of background CRM sync (which filters on a non-null externalSalonId).
//
// Consequence: all seed salons of a provider impersonate the SAME real CRM
// company, so their booking workers/slots reflect that one company.
//
// Idempotent: re-running keeps each salon's existing provider assignment and
// re-asserts the catalog clone, registry and credential.
async function seedCrmLinks(slugToId: Record<string, string>): Promise<void> {
  console.log('Connecting seed salons to CRM companies...');

  const anchorByProvider = new Map<string, CrmAnchor>();
  for (const email of CRM_OWNER_EMAILS) {
    const owner = await prisma.users.findUnique({ where: { email }, select: { id: true } });
    if (!owner) {
      console.warn(`  Owner ${email} not found — skipping`);
      continue;
    }
    // The real CRM salon is the one carrying an externalSalonId — seed salons we
    // link below deliberately leave it null, so this filter excludes them and
    // keeps the anchor lookup stable across re-runs.
    const crmSalon = await prisma.salon.findFirst({
      where: { ownerUserId: owner.id, provider: { not: null }, externalSalonId: { not: null } },
      select: { id: true, provider: true, ownerUserId: true, brandId: true, bookingUrl: true, timezone: true },
    });
    if (!crmSalon?.provider || !crmSalon.ownerUserId) {
      console.warn(`  No CRM-linked salon for ${email} — skipping`);
      continue;
    }
    const provider = crmSalon.provider;

    const account = await prisma.crmAccount.findUnique({
      where: { salonId_provider: { salonId: crmSalon.id, provider } },
      select: { data: true },
    });
    const cred = await prisma.crmCredential.findUnique({
      where: { salonId_provider: { salonId: crmSalon.id, provider } },
      select: { cipherText: true, iv: true, authTag: true },
    });
    if (!account || !cred) {
      console.warn(`  ${email} salon missing Account Registry/credentials — skipping`);
      continue;
    }

    const token = decryptBundle(
      { cipherText: cred.cipherText, iv: cred.iv, authTag: cred.authTag },
      crmSalon.id,
      provider,
    );

    // Snapshot the anchor salon's full catalog once; it gets cloned onto every
    // seed salon of this provider so their pages show real categories/staff/services.
    const [categories, workers, services, links] = await Promise.all([
      prisma.category.findMany({
        where: { salonId: crmSalon.id },
        select: { id: true, crmCategoryId: true, name: true, color: true, sortOrder: true },
      }),
      prisma.worker.findMany({
        where: { salonId: crmSalon.id },
        select: {
          id: true, crmWorkerId: true, firstName: true, lastName: true, position: true,
          role: true, description: true, photoUrl: true, workingSchedule: true, isActive: true,
        },
      }),
      prisma.service.findMany({
        where: { salonId: crmSalon.id },
        select: {
          id: true, crmServiceId: true, categoryId: true, name: true, description: true,
          duration: true, price: true, currency: true, sortOrder: true, isActive: true,
        },
      }),
      prisma.workerService.findMany({
        where: { service: { salonId: crmSalon.id } },
        select: { serviceId: true, workerId: true, remoteWorkerId: true },
      }),
    ]);

    anchorByProvider.set(provider, {
      email,
      provider,
      ownerUserId: crmSalon.ownerUserId,
      brandId: crmSalon.brandId,
      accountData: account.data,
      token,
      bookingUrl: crmSalon.bookingUrl,
      timezone: crmSalon.timezone,
      categories,
      workers,
      services,
      links,
    });
  }

  const anchors = [...anchorByProvider.values()];
  if (anchors.length === 0) {
    console.log('  No fully-connected CRM anchor salons found — nothing to link');
    return;
  }

  const seedSalons = await prisma.salon.findMany({
    where: { name: { startsWith: SEARCH_SEED_PREFIX } },
    select: { id: true, provider: true },
  });
  if (seedSalons.length === 0) {
    console.log('  No seed salons found — run the salons step first');
    return;
  }

  // Assign each seed salon to a CRM anchor — keep any existing provider so re-runs
  // don't reshuffle; otherwise pick at random.
  const assignments = seedSalons.map((salon) => ({
    salonId: salon.id,
    anchor: (salon.provider && anchorByProvider.get(salon.provider)) || pickRandom(anchors),
  }));
  const allSeedIds = seedSalons.map((s) => s.id);

  // 1) Bulk-set CRM identity + price range per provider. Every salon of a provider
  //    shares the same values, so this is just one updateMany per provider.
  //    bookingUrl is what EasyWeek salons open on "Book"; timezone drives client-side
  //    slot-time formatting (without it the app falls back to the device's zone).
  for (const anchor of anchors) {
    const ids = assignments.filter((a) => a.anchor.provider === anchor.provider).map((a) => a.salonId);
    if (!ids.length) continue;
    const prices = anchor.services.map((s) => s.price).filter((p) => p > 0);
    await prisma.salon.updateMany({
      where: { id: { in: ids } },
      data: {
        provider: anchor.provider,
        ownerUserId: anchor.ownerUserId,
        brandId: anchor.brandId,
        bookingUrl: anchor.bookingUrl,
        timezone: anchor.timezone ?? 'Europe/Kyiv',
        minPriceCents: prices.length ? Math.min(...prices) : null,
        maxPriceCents: prices.length ? Math.max(...prices) : null,
      },
    });
  }

  // 2) Wipe existing inner data + CRM identity for all seed salons in bulk
  //    (FK-safe order: workers, then services, then categories).
  await prisma.worker.deleteMany({ where: { salonId: { in: allSeedIds } } });
  await prisma.service.deleteMany({ where: { salonId: { in: allSeedIds } } });
  await prisma.category.deleteMany({ where: { salonId: { in: allSeedIds } } });
  await prisma.crmAccount.deleteMany({ where: { salonId: { in: allSeedIds } } });
  await prisma.crmCredential.deleteMany({ where: { salonId: { in: allSeedIds } } });

  // 3) Build every salon's cloned catalog + registry/credential rows in memory.
  const catRows: Prisma.CategoryCreateManyInput[] = [];
  const svcRows: Prisma.ServiceCreateManyInput[] = [];
  const workerRows: Prisma.WorkerCreateManyInput[] = [];
  const linkRows: Prisma.WorkerServiceCreateManyInput[] = [];
  const mapRows: Prisma.SalonCategoryMappingCreateManyInput[] = [];
  const accountRows: Prisma.CrmAccountCreateManyInput[] = [];
  const credRows: Prisma.CrmCredentialCreateManyInput[] = [];
  const tally: Record<string, number> = {};

  for (const [i, { salonId, anchor }] of assignments.entries()) {
    const rows = buildCatalogRows(salonId, anchor, slugToId);
    catRows.push(...rows.categories);
    svcRows.push(...rows.services);
    workerRows.push(...rows.workers);
    linkRows.push(...rows.links);
    mapRows.push(...rows.mappings);

    accountRows.push({ salonId, provider: anchor.provider, data: anchor.accountData as Prisma.InputJsonValue });
    // Re-encrypt the real CRM token under this salon's id (AAD = salonId:provider).
    const enc = encryptBundle(anchor.token, salonId, anchor.provider);
    credRows.push({
      salonId,
      provider: anchor.provider,
      cipherText: Buffer.from(enc.cipherText),
      iv: Buffer.from(enc.iv),
      authTag: Buffer.from(enc.authTag),
    });

    tally[anchor.email] = (tally[anchor.email] ?? 0) + 1;
    if (verbose) {
      console.log(
        `    [${i + 1}/${assignments.length}] ${anchor.provider} → ${anchor.email}: ` +
          `${rows.categories.length} cats (${rows.mappings.length} mapped), ${rows.services.length} svcs, ` +
          `${rows.workers.length} workers, tz ${anchor.timezone ?? 'Europe/Kyiv'}`,
      );
    }
  }

  // 4) Batch-insert everything in a handful of createMany calls (chunked).
  await insertChunked(catRows, (b) => prisma.category.createMany({ data: b }));
  await insertChunked(svcRows, (b) => prisma.service.createMany({ data: b }));
  await insertChunked(workerRows, (b) => prisma.worker.createMany({ data: b }));
  await insertChunked(linkRows, (b) => prisma.workerService.createMany({ data: b, skipDuplicates: true }));
  await insertChunked(mapRows, (b) => prisma.salonCategoryMapping.createMany({ data: b, skipDuplicates: true }));
  await insertChunked(accountRows, (b) => prisma.crmAccount.createMany({ data: b }));
  await insertChunked(credRows, (b) => prisma.crmCredential.createMany({ data: b }));

  const summary = anchors.map((a) => `${tally[a.email] ?? 0}→${a.email}`).join(', ');
  console.log(
    `  Connected ${seedSalons.length} seed salons to CRM companies (${summary}); ` +
      `${catRows.length} categories, ${svcRows.length} services, ${workerRows.length} workers, ` +
      `${linkRows.length} links, ${mapRows.length} mappings`,
  );
}

async function seedHomeFeedSections(slugToId: Record<string, string>): Promise<void> {
  console.log('Seeding home feed sections...');

  for (let i = 0; i < HOME_FEED_SECTIONS.length; i++) {
    const section = HOME_FEED_SECTIONS[i];
    const filters = { ...section.filters } as Record<string, any>;
    if ((section as any).categorySlug) {
      const appCategoryId = slugToId[(section as any).categorySlug];
      if (appCategoryId) {
        filters.appCategoryId = appCategoryId;
      }
    }

    const existing = await prisma.homeFeedSection.findFirst({
      where: { title: section.title },
    });

    const isUpdate = !!existing;
    if (existing) {
      await prisma.homeFeedSection.update({
        where: { id: existing.id },
        data: {
          type: section.type,
          emoji: section.emoji,
          sortOrder: section.sortOrder,
          limit: section.limit,
          isActive: true,
          filters: filters as any,
        },
      });
    } else {
      await prisma.homeFeedSection.create({
        data: {
          type: section.type,
          title: section.title,
          emoji: section.emoji,
          sortOrder: section.sortOrder,
          limit: section.limit,
          isActive: true,
          filters: filters as any,
        },
      });
    }
    if (verbose) console.log(`    [${i + 1}/${HOME_FEED_SECTIONS.length}] ${isUpdate ? 'updated' : 'created'} "${section.title}" (${section.type})`);
  }
  console.log(`  ${HOME_FEED_SECTIONS.length} home feed sections upserted`);
}

// Canonical run order — kept fixed so cross-step dependencies always hold,
// regardless of the order steps are passed on the CLI. crm-link owns all inner
// data (categories/services/workers) by cloning the connected CRM salon; it needs
// the salon shells (salons) and the app-categories (for category mapping) first.
const STEP_ORDER = ['app-categories', 'salons', 'crm-link', 'sections'] as const;
type StepName = (typeof STEP_ORDER)[number];

// Reads requested steps from argv (e.g. `seed:local -- app-categories sections`).
// No step args → run everything. Unknown step → fail loudly with the valid list.
function parseSteps(): StepName[] {
  const tokens = process.argv.slice(2).filter((t) => !t.startsWith('--'));
  if (tokens.length === 0) return [...STEP_ORDER];

  const known = new Set<string>(STEP_ORDER);
  const invalid = tokens.filter((t) => !known.has(t));
  if (invalid.length > 0) {
    console.error(`Unknown seed step(s): ${invalid.join(', ')}`);
    console.error(`Available steps: ${STEP_ORDER.join(', ')}`);
    process.exit(1);
  }
  return STEP_ORDER.filter((s) => tokens.includes(s));
}

async function main() {
  const env = process.env.NODE_ENV || 'local';
  const steps = parseSteps();
  const run = new Set(steps);
  console.log(`=== Seeding ${env} environment ===${verbose ? ' (verbose)' : ''}`);
  console.log(`Steps: ${steps.join(', ')}\n`);

  // Lazily resolved: from this run's seeding if app-categories ran, else loaded
  // from the DB the first time a dependent step needs it.
  let slugToId: Record<string, string> | null = null;
  const getSlugToId = async () => (slugToId ??= await loadSlugToId());

  if (run.has('app-categories')) slugToId = await seedAppCategories();
  if (run.has('salons')) await seedSalons();
  if (run.has('crm-link')) await seedCrmLinks(await getSlugToId());
  if (run.has('sections')) await seedHomeFeedSections(await getSlugToId());

  console.log('\n=== Done ===');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
