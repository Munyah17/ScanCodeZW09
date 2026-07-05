import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { keyId } = body;
  if (!keyId) return j({ error: 'keyId is required.' }, 400);

  const { data: key } = await supabaseAdmin.from('api_keys').select('user_id').eq('id', keyId).single();
  if (!key) return j({ error: 'Key not found.' }, 404);

  const isOwner = key.user_id === auth.userId;
  const isAdmin = auth.profile?.user_type === 'admin';
  if (!isOwner && !isAdmin) return j({ error: 'You do not have permission to revoke this key.' }, 403);

  const { error: dbErr } = await supabaseAdmin.from('api_keys').update({ active: false }).eq('id', keyId);
  if (dbErr) return j({ error: 'Internal server error.' }, 500);
  return j({ success: true });
};

export const config = { path: '/api/keys/revoke' };
