/**
 * scripts/setup-admin.js
 *
 * One-time script: creates the first admin user in Supabase.
 * Run AFTER the migrations are applied and .env is configured.
 *
 * Usage:
 *   node scripts/setup-admin.js
 *
 * It reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from environment.
 * To pass them inline:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=eyJ... node scripts/setup-admin.js
 */

import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

const url     = process.env.SUPABASE_URL;
const svcKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !svcKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.');
  console.error('Copy them from Supabase Dashboard → Settings → API.');
  process.exit(1);
}

const supabase = createClient(url, svcKey, { auth: { persistSession: false } });

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function main() {
  console.log('\n=== ScanCodeZW — Admin Account Setup ===\n');

  const email    = await ask('Admin email address: ');
  const password = await ask('Admin password (min 8 chars): ');
  const username = await ask('Admin username (e.g. admin): ');

  if (!email || !password || !username) {
    console.error('All fields are required.'); rl.close(); process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.'); rl.close(); process.exit(1);
  }

  console.log('\nCreating admin account…');

  // Create auth user
  const { data: { user }, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (authErr) {
    console.error('Failed to create auth user:', authErr.message);
    rl.close(); process.exit(1);
  }

  // Set user_type = admin in profiles
  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ user_type: 'admin', username })
    .eq('id', user.id);

  if (profileErr) {
    console.error('Auth user created but profile update failed:', profileErr.message);
    console.error('Manually run: UPDATE profiles SET user_type=\'admin\' WHERE id=\'', user.id, '\'');
  } else {
    console.log('\n✓ Admin account created successfully!');
    console.log(`  Email:    ${email}`);
    console.log(`  Username: ${username}`);
    console.log(`  User ID:  ${user.id}`);
    console.log('\nLogin at /admin with these credentials.\n');
  }

  rl.close();
}

main().catch(err => { console.error(err); process.exit(1); });
