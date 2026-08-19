/**
 * First-admin setup CLI.
 *
 * Creates (or promotes) an administrator profile. The admin must already exist
 * as an auth user in Supabase Auth. This script uses the service-role client
 * and must only be run by an operator with backend access.
 *
 * Usage:
 *   npm run create-admin -- --email admin@example.com --full-name "Administrator" --employee-code ADMIN001
 *
 * The auth user must be created first (Supabase Dashboard → Authentication →
 * Users → Add user). This script only manages the `profiles` row.
 */
import { supabaseAdmin } from '../src/config/supabase.js';

interface Args {
  email?: string;
  fullName?: string;
  employeeCode?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--email' && argv[i + 1]) args.email = argv[i + 1];
    if (arg === '--full-name' && argv[i + 1]) args.fullName = argv[i + 1];
    if (arg === '--employee-code' && argv[i + 1]) args.employeeCode = argv[i + 1];
  }
  return args;
}

async function main(): Promise<void> {
  const { email, fullName, employeeCode } = parseArgs(process.argv.slice(2));

  if (!email || !fullName || !employeeCode) {
    console.error(
      'Usage: npm run create-admin -- --email <email> --full-name "<name>" --employee-code <code>',
    );
    process.exit(1);
  }

  // Find the auth user by email.
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('Failed to list auth users:', listError.message);
    process.exit(1);
  }

  const authUser = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (!authUser) {
    console.error(`No auth user found with email "${email}". Create it in Supabase Auth first.`);
    process.exit(1);
  }

  const { error } = await supabaseAdmin.from('profiles').upsert(
    {
      auth_user_id: authUser.id,
      email: authUser.email ?? email,
      full_name: fullName,
      employee_code: employeeCode,
      role: 'admin',
      status: 'active',
    },
    { onConflict: 'auth_user_id' },
  );

  if (error) {
    console.error('Failed to create admin profile:', error.message);
    process.exit(1);
  }

  console.log(`Admin profile created/updated for ${email} (id: ${authUser.id})`);
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
