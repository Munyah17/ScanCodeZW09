/**
 * GET /api/notifications/list
 * Returns the caller's notifications, newest first (max 50).
 */
import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth, error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('id, title, message, type, read, created_at')
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('[notifications/list] DB error:', error.message);
    return j({ error: 'Internal server error.' }, 500);
  }

  return j({ notifications: data ?? [] });
};
