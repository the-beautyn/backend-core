import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

/**
 * Promotes a user to admin in both the app `users` table and Supabase Auth.
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx ts-node scripts/promote-admin.ts <email>
 */

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: npx dotenv -e .env.local -- npx ts-node scripts/promote-admin.ts <email>');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1. Update app users table
    const user = await (prisma as any).users.findUnique({ where: { email } });
    if (!user) {
      console.error(`User with email "${email}" not found in app database`);
      process.exit(1);
    }

    await (prisma as any).users.update({
      where: { email },
      data: { role: 'admin' },
    });
    console.log(`✓ App DB: role updated to "admin" for ${email}`);

    // 2. Update Supabase Auth raw_user_meta_data
    const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const authUser = authUsers.users.find((u) => u.email === email);
    if (!authUser) {
      console.error(`User with email "${email}" not found in Supabase Auth`);
      process.exit(1);
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, {
      user_metadata: { ...authUser.user_metadata, user_role: 'admin' },
    });
    if (updateError) throw updateError;
    console.log(`✓ Supabase Auth: user_role updated to "admin" for ${email}`);

    console.log('\nDone. The user must log in again to get a fresh JWT.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
