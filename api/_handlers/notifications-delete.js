/**
 * POST /api/notifications/delete   { id }
 * Deletes one of the caller's notifications.
 */
import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const { auth, error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { id } = body;
  if (!id || typeof id !== 'string') return j({ error: 'Missing notification id.' }, 400);

  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', auth.userId);

  if (error) {
    console.error('[notifications/delete] DB error:', error.message);
    return j({ error: 'Internal server error.' }, 500);
  }

  return j({ success: true });
};
