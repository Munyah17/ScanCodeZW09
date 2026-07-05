import { requireAdmin }                                          from '../_utils/require-admin.js';
import { supabaseAdmin }                                         from '../_utils/supabase-admin.js';
import { j }                                                    from '../_utils/response.js';
import { isValidEmail, isUsername, isStrongPassword, firstError } from '../_utils/validate.js';

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

  const valErr = firstError([
    { check: isValidEmail(email),          msg: 'A valid email address is required.' },
    { check: isUsername(username),         msg: 'Username must be 2â€“50 alphanumeric characters.' },
    { check: isStrongPassword(password),   msg: 'Password must be at least 8 characters.' },
  ]);
  if (valErr) return j({ error: valErr }, 400);

  try {
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (authErr) {
      console.error('[Admin create-user] auth error:', authErr.message);
      return j({ error: 'Could not create account. Email may already be in use.' }, 400);
    }

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
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/admin/create-user' };
