import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const {
    username,
    email,
    password,
    subscription_type = 'starter',
    enterprise_config = null,
    admin_notes       = null,
  } = body;

  if (!username || !email || !password) return j({ error: 'username, email, and password are required.' }, 400);
  if (password.length < 6)             return j({ error: 'Password must be at least 6 characters.' }, 400);

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (authErr) return j({ error: authErr.message }, 400);

    const profileUpdate = {
      subscription_type,
      override_by: admin.id,
      updated_at:  new Date().toISOString(),
    };
    if (enterprise_config) profileUpdate.enterprise_config = enterprise_config;
    if (admin_notes)       profileUpdate.admin_notes       = admin_notes;

    const { error: profileErr } = await supabaseAdmin.from('profiles').update(profileUpdate).eq('id', user.id);
    if (profileErr) console.warn('[create-user] profile update warning:', profileErr.message);

    return j({ success: true, userId: user.id });
  } catch (err) {
    console.error('[Admin create-user]', err.message);
    return j({ error: err.message }, 500);
  }
};

export const config = { path: '/api/admin/create-user' };
