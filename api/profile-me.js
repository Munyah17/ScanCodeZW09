import { requireAuth }   from './_utils/require-auth.js';
import { supabaseAdmin } from './_utils/supabase-admin.js';
import { j }             from './_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const { data, error: dbErr } = await supabaseAdmin
    .from('profiles')
    .select('username, subscription_type, subscription_end_date, enterprise_config, user_type')
    .eq('id', auth.userId)
    .single();

  if (dbErr) {
    console.error('[profile/me]', dbErr.message);
    return j({ error: 'Internal server error.' }, 500);
  }
  return j({ profile: data });
};

export const config = { path: '/api/profile/me' };
