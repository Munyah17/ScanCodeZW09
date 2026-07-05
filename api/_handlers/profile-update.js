import { requireAuth }                       from '../_utils/require-auth.js';
import { supabaseAdmin }                    from '../_utils/supabase-admin.js';
import { j }                               from '../_utils/response.js';
import { isUsername, firstError }          from '../_utils/validate.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'PATCH') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { username } = body;

  const err = firstError([
    { check: isUsername(username), msg: 'Username must be 2â€“50 alphanumeric characters.' },
  ]);
  if (err) return j({ error: err }, 400);

  const { error: dbErr } = await supabaseAdmin
    .from('profiles')
    .update({ username: username.trim(), updated_at: new Date().toISOString() })
    .eq('id', auth.userId);

  if (dbErr) {
    console.error('[profile/update]', dbErr.message);
    return j({ error: 'Internal server error.' }, 500);
  }
  return j({ success: true });
};

export const config = { path: '/api/profile/update' };
