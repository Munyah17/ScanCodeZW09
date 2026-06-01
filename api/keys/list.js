import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: dbErr } = await supabaseAdmin
    .from('api_keys')
    .select('id, name, key_prefix, scopes, active, last_used_at, expires_at, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false });

  if (dbErr) return j({ error: dbErr.message }, 500);
  return j(data);
};

export const config = { path: '/api/keys/list' };
