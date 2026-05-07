/**
 * POST /api/admin/create-user
 * Creates a new user account via Supabase Admin Auth, then sets their plan.
 * Requires admin JWT.
 */

import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const {
    username,
    email,
    password,
    subscription_type   = 'starter',
    enterprise_config   = null,
    admin_notes         = null,
  } = req.body ?? {};

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, and password are required.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }

  try {
    // Create auth user (email confirmed immediately — admin-created accounts don't need confirmation)
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (authErr) return res.status(400).json({ error: authErr.message });

    // The DB trigger auto-creates the profile with defaults.
    // Update with the chosen plan (and enterprise config if applicable).
    const profileUpdate = {
      subscription_type,
      override_by: admin.id,
      updated_at:  new Date().toISOString(),
    };
    if (enterprise_config) profileUpdate.enterprise_config = enterprise_config;
    if (admin_notes)       profileUpdate.admin_notes       = admin_notes;

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id);

    if (profileErr) console.warn('[create-user] profile update warning:', profileErr.message);

    return res.status(200).json({ success: true, userId: user.id });
  } catch (err) {
    console.error('[Admin create-user]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
