/**
 * GET /api/v1/products/list
 * List products belonging to the authenticated developer. Free operation.
 * Query params: limit (max 200), offset
 */

import { requireDevKey } from '../../_utils/require-dev-key.js';
import { supabaseAdmin } from '../../_utils/supabase-admin.js';
import { logUsage }      from '../../_utils/wallet-ops.js';
import { j }             from '../../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const t0 = Date.now();

  const { auth, error } = await requireDevKey(req, 'products_list');
  if (error) return error;

  const params = new URL(req.url).searchParams;
  const lim    = Math.min(parseInt(params.get('limit')  ?? '50', 10) || 50, 200);
  const off    = parseInt(params.get('offset') ?? '0', 10) || 0;

  const { data, count, error: dbErr } = await supabaseAdmin
    .from('products')
    .select('id, product_name, category, created_at', { count: 'exact' })
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .range(off, off + lim - 1);

  if (dbErr) return j({ error: 'Internal server error.' }, 500);

  await logUsage({ userId: auth.userId, keyId: auth.keyId, environment: auth.environment,
    endpoint: '/api/v1/products/list', operation: 'products_list',
    statusCode: 200, costUsd: 0, durationMs: Date.now() - t0 });

  return j({ products: data ?? [], total: count ?? 0, limit: lim, offset: off });
};

export const config = { path: '/api/v1/products/list' };
