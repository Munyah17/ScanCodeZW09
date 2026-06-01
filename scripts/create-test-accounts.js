/**
 * ScanCodeZW — Create / Seed Accounts
 *
 * Creates:
 *  1. Super Admin  (munyamuzvidziwa19@gmail.com) — permanent founder account
 *  2. Demo Admin   (admin@scancodezw.co.zw)      — for employees / operations
 *  3. Demo User    (demo@scancodezw.co.zw)        — for client testing
 *
 * Usage:
 *   node --env-file=.env scripts/create-test-accounts.js
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const UNLIMITED = {
  max_products: null,
  max_variations_per_product: null,
  features: 'Unlimited products, unlimited variations, full API access, all formats',
};

const ACCOUNTS = [
  {
    email:     'munyamuzvidziwa19@gmail.com',
    password:  'griezmann17',
    username:  'Munyah',
    full_name: 'Munyah J Griezmann Muzvidziwa',
    user_type: 'super_admin',
    sub_type:  'enterprise',
    label:     'Super Admin',
  },
  {
    email:     'admin@scancodezw.co.zw',
    password:  'Admin@ScanCode2026!',
    username:  'scancodezw_admin',
    full_name: 'ScanCodeZW Admin',
    user_type: 'admin',
    sub_type:  'enterprise',
    label:     'Demo Admin',
  },
  {
    email:     'demo@scancodezw.co.zw',
    password:  'Client@Demo2026!',
    username:  'demo_client',
    full_name: 'Demo Client',
    user_type: 'user',
    sub_type:  'pro',
    label:     'Demo User (Pro)',
  },
];

async function createAccounts() {
  console.log('\n ScanCodeZW — Creating / syncing accounts\n');

  const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingByEmail = Object.fromEntries((list?.users ?? []).map(u => [u.email, u]));

  for (const acct of ACCOUNTS) {
    process.stdout.write(`  [${acct.label}] ${acct.email} ... `);

    const existing = existingByEmail[acct.email];
    let userId;

    if (existing) {
      process.stdout.write('already exists — updating profile ... ');
      userId = existing.id;
    } else {
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email:         acct.email,
        password:      acct.password,
        email_confirm: true,
        user_metadata: { username: acct.username, full_name: acct.full_name },
      });
      if (authErr) { console.log(`FAILED: ${authErr.message}`); continue; }
      userId = authData.user.id;
      process.stdout.write('created — ');
    }

    const profileData = {
      id:                userId,
      username:          acct.username,
      user_type:         acct.user_type,
      subscription_type: acct.sub_type,
    };

    if (acct.user_type === 'super_admin') {
      profileData.enterprise_config  = UNLIMITED;
      profileData.recovery_emails    = ['munyamuzvidziwa19@gmail.com', 'mmuzvi@gmail.com'];
    }

    const { error: profErr } = await supabase.from('profiles').upsert(profileData, { onConflict: 'id' });

    if (profErr) console.log(`profile warning: ${profErr.message}`);
    else         console.log('OK');
  }

  console.log('\n');
  console.log('Accounts summary:');
  console.log('');
  for (const a of ACCOUNTS) {
    console.log(`  ${a.label}`);
    console.log(`    Email   : ${a.email}`);
    console.log(`    Password: ${a.password}`);
    console.log(`    Plan    : ${a.sub_type}`);
    console.log('');
  }
  console.log('  Role capabilities:');
  console.log('  Super Admin  — Full platform control, cannot be deleted, all data access');
  console.log('  Admin        — Customer management, support tickets, analytics, revenue');
  console.log('  User (Pro)   — Generate barcodes, products, API keys, up to 10 team members\n');
}

createAccounts().catch(err => {
  console.error('\nFatal:', err.message);
  process.exit(1);
});
