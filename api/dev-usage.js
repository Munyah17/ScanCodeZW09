/**
 * GET /api/dev/usage
 * Query params:
 *   period   â€” 7d | 30d | 90d  (default 30d)
 *   env      â€” sandbox | live | all  (default all)
 *   limit    â€” max 200 (default 50)
 *   offset   â€” (default 0)
 */

import { requireAuth }   from './_utils/require-auth.js';
import { supabaseAdmin } from './_utils/supabase-admin.js';
import { j }             from './_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const params  = new URL(req.url).searchParams;
  const period  = params.get('period')  ?? '30d';
  const env     = params.get('env')     ?? 'all';
  const lim     = Math.min(parseInt(params.get('limit')  ?? '50', 10) || 50, 200);
  const off     = parseInt(params.get('offset') ?? '0', 10) || 0;

  const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
  const since = new Date(Date.now() - days * 864e5).toISOString();

  let query = supabaseAdmin
    .from('api_usage_logs')
    .select('id, environment, endpoint, operation, status_code, cost_usd, duration_ms, created_at', { count: 'exact' })
    .eq('user_id', auth.userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .range(off, off + lim - 1);

  if (env !== 'all') query = query.eq('environment', env);

  const { data: logs, count, error: dbErr } = await query;
  if (dbErr) return j({ error: 'Internal server error.' }, 500);

  // Aggregate stats over the period
  const { data: stats } = await supabaseAdmin
    .from('api_usage_logs')
    .select('operation, cost_usd, environment, status_code')
    .eq('user_id', auth.userId)
    .gte('created_at', since);

  const totals = (stats ?? []).reduce((acc, r) => {
    acc.calls      += 1;
    acc.cost       += Number(r.cost_usd ?? 0);
    acc.errors     += r.status_code >= 400 ? 1 : 0;
    acc.live_calls += r.environment === 'live'    ? 1 : 0;
    acc.test_calls += r.environment === 'sandbox' ? 1 : 0;
    acc.by_op[r.operation] = (acc.by_op[r.operation] ?? 0) + 1;
    return acc;
  }, { calls: 0, cost: 0, errors: 0, live_calls: 0, test_calls: 0, by_op: {} });

  totals.cost = parseFloat(totals.cost.toFixed(6));

  return j({
    period:  `${days}d`,
    summary: totals,
    logs:    logs ?? [],
    total:   count ?? 0,
    limit:   lim,
    offset:  off,
  });
};

export const config = { path: '/api/dev/usage' };
