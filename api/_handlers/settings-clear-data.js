import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'DELETE') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  if (auth.profile?.user_type === 'super_admin') {
    return j({ error: 'Super Admin account cannot be self-deleted.' }, 403);
  }

  try {
    await supabaseAdmin.from('variations').delete().eq('user_id', auth.userId);
    await supabaseAdmin.from('products').delete().eq('user_id', auth.userId);
    return j({ success: true });
  } catch (err) {
    console.error('[settings/clear-data]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/settings/clear-data' };
