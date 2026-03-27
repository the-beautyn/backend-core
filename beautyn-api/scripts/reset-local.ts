/**
 * Cleans up Supabase Auth users and their corresponding local DB records.
 *
 * 1. Fetches all users from Supabase Auth
 * 2. Deletes matching rows from the local `users` table
 * 3. Deletes the users from Supabase Auth
 *
 * Usage: npm run reset:local:users
 */
import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '@prisma/client';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const prisma = new PrismaClient();

  try {
    console.log('Fetching Supabase Auth users...');

    const userIds: string[] = [];
    let page = 1;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error) {
        console.error('Failed to list auth users:', error.message);
        process.exit(1);
      }
      const users = data?.users ?? [];
      if (users.length === 0) break;
      userIds.push(...users.map((u) => u.id));
      if (users.length < 100) break;
      page++;
    }

    if (userIds.length === 0) {
      console.log('No Supabase Auth users found — nothing to clean up');
      return;
    }

    console.log(`Found ${userIds.length} auth user(s)`);

    // Delete local DB records first (FK constraints)
    const deleted = await prisma.users.deleteMany({ where: { id: { in: userIds } } });
    console.log(`Deleted ${deleted.count} local DB user(s)`);

    // Delete from Supabase Auth
    let authDeleted = 0;
    for (const id of userIds) {
      const { error } = await supabase.auth.admin.deleteUser(id);
      if (error) {
        console.error(`  Failed to delete auth user ${id}: ${error.message}`);
      } else {
        authDeleted++;
      }
    }
    console.log(`Deleted ${authDeleted} Supabase Auth user(s)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
