import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  // Revoke a key
  if (req.method === 'DELETE') {
    const { key_id } = await req.json().catch(() => ({}));
    if (!key_id) return j({ error: 'key_id required' }, 400);
    const { error: e } = await supabaseAdmin.from('api_keys').delete().eq('id', key_id);
    if (e) return j({ error: 'Internal server error.' }, 500);
    return j({ success: true });
  }

  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  try {
    const { data: keys, error: e } = await supabaseAdmin
      .from('api_keys')
      .select('id, name, key_prefix, scopes, created_at, last_used_at, request_count, user_id, profiles(username, user_type)')
      .order('created_at', { ascending: false });

    if (e) return j({ error: 'Internal server error.' }, 500);
    return j({ keys: keys ?? [] });
  } catch (err) {
    console.error('[Admin api-keys]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/admin/all-api-keys' };
