/**
 * GET  /api/dev/account  â€” fetch developer account status + wallet
 * POST /api/dev/account  â€” enable developer mode (creates wallet on first call)
 */

import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { ensureWallet, getWallet } from '../_utils/wallet-ops.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  if (req.method === 'POST') {
    // Enable developer mode â€” idempotent
    await ensureWallet(auth.userId);
    const wallet = await getWallet(auth.userId);
    return j({ success: true, wallet, message: 'Developer account is active.' });
  }

  if (req.method === 'GET') {
    const wallet = await getWallet(auth.userId);
    const { data: keyCount } = await supabaseAdmin
      .from('dev_api_keys')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', auth.userId)
      .eq('active', true);

    return j({
      developer: {
        userId:       auth.userId,
        email:        auth.email,
        wallet:       wallet ?? null,
        active_keys:  keyCount ?? 0,
        portal_url:   'https://developers.scancodezw.co.zw',
      },
    });
  }

  return j({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/dev/account' };
