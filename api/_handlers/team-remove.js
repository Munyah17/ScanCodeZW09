import { requireAuth }              from '../_utils/require-auth.js';
import { supabaseAdmin }            from '../_utils/supabase-admin.js';
import { j }                       from '../_utils/response.js';
import { isValidUuid, firstError } from '../_utils/validate.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { memberId } = body;

  const err = firstError([
    { check: isValidUuid(memberId), msg: 'Invalid memberId.' },
  ]);
  if (err) return j({ error: err }, 400);

  // Confirm the member belongs to this user before touching it
  const { data: member } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('id', memberId)
    .eq('parent_user_id', auth.userId)
    .single();

  if (!member) return j({ error: 'Member not found.' }, 404);

  const { error: dbErr } = await supabaseAdmin
    .from('profiles')
    .update({ parent_user_id: null, sub_role: null })
    .eq('id', memberId);

  if (dbErr) {
    console.error('[team/remove]', dbErr.message);
    return j({ error: 'Internal server error.' }, 500);
  }
  return j({ success: true });
};

export const config = { path: '/api/team/remove' };
