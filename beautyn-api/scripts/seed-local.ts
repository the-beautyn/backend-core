import { randomUUID } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { APP_CATEGORIES, HOME_FEED_SECTIONS, SALON_NAMES, SEARCH_SEED_PREFIX } from './search-seed-constants';

const prisma = new PrismaClient();
const verbose = process.argv.includes('--verbose');

const SALON_COUNT = 200;
const BASE_LAT = 50.4501;
const BASE_LNG = 30.5234;

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

const WORKER_FIRST_NAMES = [
  'Olena', 'Iryna', 'Kateryna', 'Anna', 'Sofiia', 'Mariia', 'Yuliia', 'Nataliia',
  'Oksana', 'Tetiana', 'Dmytro', 'Andrii', 'Serhii', 'Maksym', 'Oleksandr', 'Viktoriia',
];

const WORKER_LAST_NAMES = [
  'Shevchenko', 'Kovalenko', 'Bondarenko', 'Tkachenko', 'Melnyk', 'Boyko', 'Kravchuk',
  'Polishchuk', 'Marchenko', 'Romaniuk', 'Lysenko', 'Savchenko',
];

const POSITION_BY_SLUG: Record<string, string> = {
  nails: 'Nail Master',
  hair: 'Hair Stylist',
  face: 'Cosmetologist',
  brow: 'Brow & Lash Artist',
  makeup: 'Makeup Artist',
  epilation: 'Epilation Specialist',
  spa: 'Massage Therapist',
  injectables: 'Aesthetic Doctor',
  trichology: 'Trichologist',
  mens: 'Barber',
};

// Templates use UAH and minutes; converted to cents and seconds at insert time.
type ServiceTemplate = { name: string; duration: number; minUah: number; maxUah: number };

const SERVICE_TEMPLATES: Record<string, ServiceTemplate[]> = {
  nails: [
    { name: 'Класичний манікюр', duration: 60, minUah: 250, maxUah: 400 },
    { name: 'Манікюр з покриттям гель‑лак', duration: 90, minUah: 350, maxUah: 600 },
    { name: 'Педикюр з покриттям', duration: 90, minUah: 450, maxUah: 700 },
    { name: 'Нарощування нігтів', duration: 120, minUah: 600, maxUah: 1000 },
  ],
  hair: [
    { name: 'Жіноча стрижка', duration: 60, minUah: 300, maxUah: 700 },
    { name: 'Чоловіча стрижка', duration: 45, minUah: 200, maxUah: 400 },
    { name: 'Фарбування волосся', duration: 150, minUah: 800, maxUah: 2500 },
    { name: 'Укладка волосся', duration: 45, minUah: 250, maxUah: 500 },
  ],
  face: [
    { name: 'Чистка обличчя', duration: 90, minUah: 600, maxUah: 1200 },
    { name: 'Хімічний пілінг', duration: 60, minUah: 700, maxUah: 1500 },
    { name: 'Догляд за шкірою обличчя', duration: 75, minUah: 800, maxUah: 1600 },
  ],
  brow: [
    { name: 'Корекція та фарбування брів', duration: 45, minUah: 200, maxUah: 400 },
    { name: 'Ламінування брів', duration: 60, minUah: 400, maxUah: 700 },
    { name: 'Нарощування вій', duration: 120, minUah: 500, maxUah: 900 },
  ],
  makeup: [
    { name: 'Денний макіяж', duration: 60, minUah: 500, maxUah: 900 },
    { name: 'Вечірній макіяж', duration: 90, minUah: 800, maxUah: 1500 },
    { name: 'Весільний макіяж', duration: 120, minUah: 1500, maxUah: 3000 },
  ],
  epilation: [
    { name: 'Лазерна епіляція (зона)', duration: 30, minUah: 300, maxUah: 800 },
    { name: 'Воскова депіляція ніг', duration: 45, minUah: 350, maxUah: 600 },
    { name: 'Шугаринг зони бікіні', duration: 45, minUah: 400, maxUah: 700 },
  ],
  spa: [
    { name: 'Класичний масаж спини', duration: 60, minUah: 400, maxUah: 800 },
    { name: 'Релакс‑масаж усього тіла', duration: 90, minUah: 700, maxUah: 1300 },
    { name: 'Лімфодренажний масаж', duration: 60, minUah: 600, maxUah: 1000 },
  ],
  injectables: [
    { name: 'Біоревіталізація', duration: 60, minUah: 1500, maxUah: 3500 },
    { name: 'Контурна пластика губ', duration: 60, minUah: 4000, maxUah: 7000 },
    { name: 'Ботокс (зона)', duration: 45, minUah: 2000, maxUah: 4500 },
  ],
  trichology: [
    { name: 'Консультація трихолога', duration: 45, minUah: 400, maxUah: 800 },
    { name: 'Мезотерапія шкіри голови', duration: 60, minUah: 800, maxUah: 1600 },
    { name: 'Лікування випадіння волосся', duration: 75, minUah: 1000, maxUah: 2500 },
  ],
  mens: [
    { name: 'Чоловіча стрижка', duration: 45, minUah: 200, maxUah: 450 },
    { name: 'Оформлення бороди', duration: 30, minUah: 150, maxUah: 350 },
    { name: 'Стрижка + борода', duration: 75, minUah: 350, maxUah: 700 },
  ],
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

function slugFromCrmCategoryId(crmCategoryId: string): string {
  return crmCategoryId.split('-')[0];
}

function randomWorkerSchedule() {
  // Sunday off, Mon–Sat 09:00–19:00. weekday: 0=Sun..6=Sat (matches salon open hours).
  const days = Array.from({ length: 7 }).map((_, weekday) => {
    const isDayOff = weekday === 0;
    return {
      weekday,
      isDayOff,
      intervals: isDayOff ? [] : [{ start: '09:00', end: '19:00' }],
    };
  });
  return { timezone: 'Europe/Kyiv', days };
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

async function seedCategoryMappings(slugToId: Record<string, string>): Promise<void> {
  console.log('Seeding category mappings...');

  const salons = await prisma.salon.findMany({
    where: { name: { startsWith: SEARCH_SEED_PREFIX } },
    select: { id: true },
  });

  // Check if mappings already exist
  if (salons.length > 0) {
    const existingMappings = await prisma.category.count({
      where: { salonId: salons[0].id },
    });
    if (existingMappings > 0) {
      console.log('  Category mappings already exist — skipping');
      return;
    }
  }

  let mappingCount = 0;
  for (let s = 0; s < salons.length; s++) {
    const salon = salons[s];
    const categoryCount = 2 + Math.floor(Math.random() * 3);
    const shuffled = APP_CATEGORIES.slice().sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, categoryCount);

    for (const cat of picked) {
      const appCategoryId = slugToId[cat.slug];
      if (!appCategoryId) continue;

      const category = await prisma.category.create({
        data: {
          salonId: salon.id,
          crmCategoryId: `${cat.slug}-${Math.random().toString(36).slice(2, 8)}`,
          name: cat.name,
          color: null,
          sortOrder: null,
          serviceIds: [],
        },
      });
      await prisma.salonCategoryMapping.create({
        data: {
          salonCategoryId: category.id,
          appCategoryId,
          autoMatched: true,
        },
      });
      mappingCount++;
      if (verbose) console.log(`    [salon ${s + 1}/${salons.length}] mapped "${cat.name}" (total: ${mappingCount})`);
    }
  }
  console.log(`  ${mappingCount} category mappings created for ${salons.length} salons`);
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

let workerSeq = 0;

async function seedWorkersAndServices(): Promise<void> {
  console.log('Seeding workers and services...');

  const salons = await prisma.salon.findMany({
    where: { name: { startsWith: SEARCH_SEED_PREFIX } },
    select: {
      id: true,
      categories: { select: { id: true, crmCategoryId: true } },
    },
  });

  if (salons.length === 0) {
    console.log('  No seed salons found — skipping');
    return;
  }

  const existingServices = await prisma.service.count({ where: { salonId: salons[0].id } });
  if (existingServices > 0) {
    console.log('  Services already exist — skipping');
    return;
  }

  let workerCount = 0;
  let serviceCount = 0;
  let linkCount = 0;

  for (let s = 0; s < salons.length; s++) {
    const salon = salons[s];
    const salonSlugs = salon.categories.map((c) => slugFromCrmCategoryId(c.crmCategoryId));

    // 1) Workers — 3..5 per salon, positioned by the salon's categories.
    const numWorkers = 3 + Math.floor(Math.random() * 3);
    const workers: { id: string; slug: string }[] = [];
    for (let w = 0; w < numWorkers; w++) {
      workerSeq++;
      const slug = salonSlugs.length ? salonSlugs[w % salonSlugs.length] : 'nails';
      const firstName = pickRandom(WORKER_FIRST_NAMES);
      const lastName = pickRandom(WORKER_LAST_NAMES);
      const worker = await prisma.worker.create({
        data: {
          salonId: salon.id,
          crmWorkerId: `seed-w-${workerSeq}`,
          firstName,
          lastName,
          position: POSITION_BY_SLUG[slug] ?? 'Beauty Specialist',
          photoUrl: `https://placehold.co/200x200/efe8d8/5a483a?text=${firstName[0]}${lastName[0]}`,
          email: `seed.w${workerSeq}@beautyn.local`,
          phone: `+38050${String(workerSeq).padStart(7, '0')}`,
          workingSchedule: randomWorkerSchedule() as any,
          isActive: true,
        },
      });
      workers.push({ id: worker.id, slug });
      workerCount++;
    }

    // 2) Services per salon category, linked to matching workers.
    for (const cat of salon.categories) {
      const slug = slugFromCrmCategoryId(cat.crmCategoryId);
      const templates = SERVICE_TEMPLATES[slug] ?? SERVICE_TEMPLATES.nails;
      const numServices = 2 + Math.floor(Math.random() * Math.min(3, templates.length));
      const picked = shuffle(templates).slice(0, numServices);
      const createdServiceIds: string[] = [];

      for (let i = 0; i < picked.length; i++) {
        const tpl = picked[i];
        const priceUah = tpl.minUah + Math.floor(Math.random() * (tpl.maxUah - tpl.minUah + 1));
        const service = await prisma.service.create({
          data: {
            salonId: salon.id,
            crmServiceId: `seed-svc-${cat.id.slice(0, 8)}-${i}`,
            categoryId: cat.id,
            name: tpl.name,
            duration: tpl.duration * 60,
            price: priceUah * 100,
            currency: 'UAH',
            sortOrder: i,
            isActive: true,
          },
        });
        createdServiceIds.push(service.id);
        serviceCount++;

        // Link 1..3 workers, preferring those matching the category slug.
        const matching = workers.filter((wk) => wk.slug === slug);
        const pool = matching.length ? matching : workers;
        const numLinks = 1 + Math.floor(Math.random() * Math.min(3, pool.length));
        for (const lw of shuffle(pool).slice(0, numLinks)) {
          await prisma.workerService.create({
            data: { serviceId: service.id, workerId: lw.id },
          });
          linkCount++;
        }
      }

      await prisma.category.update({
        where: { id: cat.id },
        data: { serviceIds: createdServiceIds },
      });
    }

    if (verbose) {
      console.log(`    [salon ${s + 1}/${salons.length}] ${numWorkers} workers, services for ${salon.categories.length} categories`);
    }
  }

  console.log(`  ${workerCount} workers, ${serviceCount} services, ${linkCount} worker-service links created`);
}

// Canonical run order — kept fixed so cross-step dependencies (mappings and
// sections need app categories; mappings/workers need salons) always hold,
// regardless of the order steps are passed on the CLI.
const STEP_ORDER = ['app-categories', 'salons', 'mappings', 'workers', 'sections'] as const;
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
  if (run.has('mappings')) await seedCategoryMappings(await getSlugToId());
  if (run.has('workers')) await seedWorkersAndServices();
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
