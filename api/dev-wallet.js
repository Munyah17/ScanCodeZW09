/**
 * GET /api/dev/wallet
 * Returns wallet balance + paginated transaction history.
 * Query params: limit (default 20, max 100), offset (default 0)
 */

import { requireAuth }   from './_utils/require-auth.js';
import { supabaseAdmin } from './_utils/supabase-admin.js';
import { j }             from './_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const params = new URL(req.url).searchParams;
  const lim    = Math.min(parseInt(params.get('limit')  ?? '20', 10) || 20, 100);
  const off    = parseInt(params.get('offset') ?? '0', 10) || 0;

  // Wallet summary
  const { data: wallet } = await supabaseAdmin
    .from('developer_wallets')
    .select('id, balance, currency, status, updated_at')
    .eq('user_id', auth.userId)
    .single();

  if (!wallet) {
    return j({ balance: null, message: 'Developer wallet not yet enabled. POST /api/dev/account to activate.' });
  }

  // Transaction history
  const { data: transactions, count } = await supabaseAdmin
    .from('wallet_transactions')
    .select('id, type, amount, balance_before, balance_after, reference, description, metadata, created_at', { count: 'exact' })
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })
    .range(off, off + lim - 1);

  return j({
    wallet: {
      balance:    wallet.balance,
      currency:   wallet.currency,
      status:     wallet.status,
      updated_at: wallet.updated_at,
    },
    transactions: transactions ?? [],
    total:        count ?? 0,
    limit:        lim,
    offset:       off,
  });
};

export const config = { path: '/api/dev/wallet' };
