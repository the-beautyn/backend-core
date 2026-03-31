import { PrismaClient } from '@prisma/client';
import { SEARCH_SEED_PREFIX } from './search-seed-constants';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Cleaning up local environment ===\n');

  // 1. Delete home feed sections
  const sections = await prisma.homeFeedSection.deleteMany({});
  console.log(`Deleted ${sections.count} home feed sections`);

  // 2. Find seeded salons
  const seededSalons = await prisma.salon.findMany({
    where: { name: { startsWith: SEARCH_SEED_PREFIX } },
    select: { id: true },
  });
  const salonIds = seededSalons.map((s) => s.id);

  if (salonIds.length > 0) {
    // 3. Delete category mappings for seeded salons
    const categories = await prisma.category.findMany({
      where: { salonId: { in: salonIds } },
      select: { id: true },
    });
    const categoryIds = categories.map((c) => c.id);

    if (categoryIds.length > 0) {
      const mappings = await prisma.salonCategoryMapping.deleteMany({
        where: { salonCategoryId: { in: categoryIds } },
      });
      console.log(`Deleted ${mappings.count} salon category mappings`);
    }

    // 4. Delete categories for seeded salons
    const cats = await prisma.category.deleteMany({
      where: { salonId: { in: salonIds } },
    });
    console.log(`Deleted ${cats.count} categories`);

    // 5. Delete saved salons referencing seeded salons
    const savedSalons = await prisma.savedSalon.deleteMany({
      where: { salonId: { in: salonIds } },
    });
    console.log(`Deleted ${savedSalons.count} saved salons`);

    // 6. Delete seeded salons
    const salons = await prisma.salon.deleteMany({
      where: { id: { in: salonIds } },
    });
    console.log(`Deleted ${salons.count} salons`);
  } else {
    console.log('No seeded salons found');
  }

  // 7. Delete app categories
  const appCats = await prisma.appCategory.deleteMany({});
  console.log(`Deleted ${appCats.count} app categories`);

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
