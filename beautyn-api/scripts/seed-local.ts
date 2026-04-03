import { Prisma, PrismaClient } from '@prisma/client';
import { APP_CATEGORIES, HOME_FEED_SECTIONS, SALON_NAMES, SEARCH_SEED_PREFIX } from './search-seed-constants';

const prisma = new PrismaClient();

const SALON_COUNT = 150;
const BASE_LAT = 50.4501;
const BASE_LNG = 30.5234;

const SALON_IMAGES = [
  'http://127.0.0.1:54321/storage/v1/object/public/dump/865c5717-29b8-42f9-bc19-0fb75c3abae1.jpg',
  'http://127.0.0.1:54321/storage/v1/object/public/dump/0d1d69f6-23ee-42ad-945a-0a18bd49651c.jpg',
  'http://127.0.0.1:54321/storage/v1/object/public/dump/8633744a-d876-4d1c-91a8-7fe43efc6556.jpg',
];

const CATEGORY_IMAGES = [
  'http://127.0.0.1:54321/storage/v1/object/public/dump/4b862e59-a3ac-4482-b16a-e6e26ccaac49.png',
  'http://127.0.0.1:54321/storage/v1/object/public/dump/e449d225-70f3-42ca-8d82-1f7ce4665b01.png',
  'http://127.0.0.1:54321/storage/v1/object/public/dump/59a4aba3-02a9-477a-ab6a-809aef4058a3.png',
];

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

function randomOpenHours() {
  return Array.from({ length: 7 }).map((_, idx) => {
    const startHour = 9 + Math.floor(Math.random() * 2);
    const endHour = 18 + Math.floor(Math.random() * 3);
    return {
      day: idx,
      periods: [
        {
          start: `${String(startHour).padStart(2, '0')}:00`,
          end: `${String(endHour).padStart(2, '0')}:00`,
        },
      ],
    };
  });
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
    const record = existing
      ? await prisma.appCategory.update({ where: { id: existing.id }, data: payload })
      : await prisma.appCategory.create({ data: payload });
    slugToId[cat.slug] = record.id;
  }

  console.log(`  ${APP_CATEGORIES.length} app categories upserted`);
  return slugToId;
}

async function seedSalons(): Promise<void> {
  console.log('Seeding salons...');

  const existingCount = await prisma.salon.count({
    where: { name: { startsWith: SEARCH_SEED_PREFIX } },
  });
  if (existingCount > 0) {
    console.log(`  ${existingCount} seed salons already exist — skipping`);
    return;
  }

  const salons: Prisma.SalonCreateManyInput[] = Array.from({ length: SALON_COUNT }).map((_, idx) => {
    const { lat, lng } = randomOffset();
    const rating = Math.round((Math.random() * 2 + 3) * 10) / 10;
    const ratingCount = Math.floor(Math.random() * 500);
    const prices = randomPrice();
    const baseName = SALON_NAMES[idx % SALON_NAMES.length];
    return {
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
      openHoursJson: randomOpenHours() as any,
      coverImageUrl: SALON_IMAGES[idx % SALON_IMAGES.length],
    };
  });

  const result = await prisma.salon.createMany({ data: salons, skipDuplicates: true });
  console.log(`  ${result.count} salons created`);
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
  for (const salon of salons) {
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
    }
  }
  console.log(`  ${mappingCount} category mappings created for ${salons.length} salons`);
}

async function seedHomeFeedSections(slugToId: Record<string, string>): Promise<void> {
  console.log('Seeding home feed sections...');

  for (const section of HOME_FEED_SECTIONS) {
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
  }
  console.log(`  ${HOME_FEED_SECTIONS.length} home feed sections upserted`);
}

async function main() {
  console.log('=== Seeding local environment ===\n');

  const slugToId = await seedAppCategories();
  await seedSalons();
  await seedCategoryMappings(slugToId);
  await seedHomeFeedSections(slugToId);

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
