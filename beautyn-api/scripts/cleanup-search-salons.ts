import { PrismaClient } from '@prisma/client';
import { SEARCH_SEED_PREFIX, SALON_NAMES } from './search-seed-constants';

const prisma = new PrismaClient();

async function main() {
  // Delete salons by prefix or by known generated names
  const res = await prisma.salon.deleteMany({
    where: {
      OR: [
        { name: { startsWith: SEARCH_SEED_PREFIX } },
        { name: { in: SALON_NAMES.map((n) => `${SEARCH_SEED_PREFIX} ${n}`) } },
      ],
    },
  });
  console.log(`Deleted ${res.count} salons with prefix "${SEARCH_SEED_PREFIX}"`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
