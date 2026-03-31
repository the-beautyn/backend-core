import { Prisma, PrismaClient } from '@prisma/client';
import { APP_CATEGORIES, SALON_NAMES, SEARCH_SEED_PREFIX } from './search-seed-constants';

const prisma = new PrismaClient();

// Generate more than 100 to ensure enough data spread
const COUNT = 150;
const BASE_LAT = 50.4501;
const BASE_LNG = 30.5234;

function randomOffset(radiusKm = 5): { lat: number; lng: number } {
  // Rough conversion: 1 degree latitude ~= 111km; longitude scaled by cos(lat).
  const kmPerDegLat = 111;
  const kmPerDegLng = 111 * Math.cos((BASE_LAT * Math.PI) / 180);
  const deltaKmLat = (Math.random() * 2 - 1) * radiusKm;
  const deltaKmLng = (Math.random() * 2 - 1) * radiusKm;
  const lat = BASE_LAT + deltaKmLat / kmPerDegLat;
  const lng = BASE_LNG + deltaKmLng / kmPerDegLng;
  return { lat, lng };
}

function randomPrice(): { min: number; max: number } {
  const min = 2000 + Math.floor(Math.random() * 8000); // 20-100 (in cents)
  const max = min + 2000 + Math.floor(Math.random() * 8000);
  return { min, max };
}

function randomOpenHours() {
  const days = Array.from({ length: 7 }).map((_, idx) => {
    const startHour = 9 + Math.floor(Math.random() * 2); // 9-10
    const endHour = 18 + Math.floor(Math.random() * 3); // 18-20
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
  return days;
}

async function ensureAppCategories(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const cat of APP_CATEGORIES) {
    const existing = await prisma.appCategory.findFirst({ where: { slug: cat.slug } });
    const payload = {
      slug: cat.slug,
      name: cat.name,
      keywords: cat.keywords,
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      imageUrl: (cat as any).imageUrl ?? null,
    };
    const record = existing
      ? await prisma.appCategory.update({ where: { id: existing.id }, data: payload })
      : await prisma.appCategory.create({ data: payload });
    map[cat.name] = record.id;
  }
  return map;
}

async function main() {
  const appCategoryIds = await ensureAppCategories();

  const salons: Prisma.SalonCreateManyInput[] = Array.from({ length: COUNT }).map((_, idx) => {
    const { lat, lng } = randomOffset();
    const rating = Math.round((Math.random() * 2 + 3) * 10) / 10; // 3.0 - 5.0
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
      coverImageUrl: null,
    };
  });

  const result = await prisma.salon.createMany({
    data: salons,
    skipDuplicates: true,
  });

  // Link app categories via categories + mappings
  const createdSalons = await prisma.salon.findMany({
    where: { name: { startsWith: SEARCH_SEED_PREFIX } },
    select: { id: true, name: true },
  });

  for (const salon of createdSalons) {
    const categoryCount = 2 + Math.floor(Math.random() * 3); // 2-4 categories per salon
    const shuffled = APP_CATEGORIES.slice().sort(() => Math.random() - 0.5);
    const picked = shuffled.slice(0, categoryCount);

    for (const cat of picked) {
      const appCategoryId = appCategoryIds[cat.name];
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
    }
  }

  console.log(`Inserted ${result.count} salons with prefix "${SEARCH_SEED_PREFIX}" and linked app categories.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
