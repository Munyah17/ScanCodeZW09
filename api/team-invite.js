import { requireAuth }                                   from './_utils/require-auth.js';
import { supabaseAdmin }                                from './_utils/supabase-admin.js';
import { j }                                           from './_utils/response.js';
import { isValidEmail, isUsername, isStrongPassword, firstError } from './_utils/validate.js';

const PLAN_SUB_USER_LIMITS = {
  starter:    0,
  business:   2,
  pro:        10,
  enterprise: -1,
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const { auth, error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const plan  = auth.profile?.subscription_type ?? 'starter';
  const limit = PLAN_SUB_USER_LIMITS[plan] ?? 0;

  if (limit === 0) {
    return j({ error: 'Your plan does not support team members. Upgrade to Business or above.' }, 403);
  }

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { email, username, password, role } = body;

  const valErr = firstError([
    { check: isValidEmail(email),              msg: 'A valid email address is required.' },
    { check: isUsername(username),             msg: 'Username must be 2â€“50 alphanumeric characters.' },
    { check: isStrongPassword(password),       msg: 'Password must be at least 8 characters.' },
    { check: ['member','manager'].includes(role), msg: 'Invalid role.' },
  ]);
  if (valErr) return j({ error: valErr }, 400);

  // Check current team size
  const { count } = await supabaseAdmin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('parent_user_id', auth.userId);

  if (limit !== -1 && count >= limit) {
    return j({ error: `Team limit reached (${limit}). Upgrade your plan to add more members.` }, 403);
  }

  // Create auth account for the new sub-user
  const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email:            email.toLowerCase().trim(),
    password,
    email_confirm:    true,
    user_metadata:    { username },
  });

  if (createErr) {
    if (createErr.message?.toLowerCase().includes('already registered') ||
        createErr.message?.toLowerCase().includes('already exists')) {
      return j({ error: 'An account with that email already exists.' }, 409);
    }
    return j({ error: 'Internal server error.' }, 500);
  }

  // Update their profile with parent_user_id and sub_role
  await supabaseAdmin.from('profiles').upsert({
    id:             newUser.user.id,
    username,
    parent_user_id: auth.userId,
    sub_role:       role,
    user_type:      'user',
    subscription_type: auth.profile?.subscription_type ?? 'starter',
  }, { onConflict: 'id' });

  return j({ success: true, userId: newUser.user.id }, 201);
}

export const config = { path: '/api/team/invite' };
