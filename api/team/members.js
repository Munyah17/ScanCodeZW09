import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: dbErr } = await supabaseAdmin
    .from('profiles')
    .select('id, username, created_at, sub_role')
    .eq('parent_user_id', auth.userId)
    .order('created_at', { ascending: false });

  if (dbErr) {
    console.error('[team/members]', dbErr.message);
    return j({ error: 'Internal server error.' }, 500);
  }
  return j({ members: data ?? [] });
};

export const config = { path: '/api/team/members' };
