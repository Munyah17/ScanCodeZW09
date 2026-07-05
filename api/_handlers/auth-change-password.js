import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';
import { isStrongPassword, firstError } from '../_utils/validate.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { password } = body;

  const valErr = firstError([
    { check: isStrongPassword(password), msg: 'Password must be at least 8 characters.' },
  ]);
  if (valErr) return j({ error: valErr }, 400);

  const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(auth.userId, { password });
  if (authErr) {
    console.error('[auth/change-password]', authErr.message);
    return j({ error: 'Internal server error.' }, 500);
  }
  return j({ success: true });
};

export const config = { path: '/api/auth/change-password' };
