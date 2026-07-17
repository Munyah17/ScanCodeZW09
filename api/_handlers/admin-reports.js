import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

/**
 * GET /api/admin/reports?from=YYYY-MM-DD&to=YYYY-MM-DD
 * On-demand report over real data for an arbitrary date range — signups,
 * revenue, barcodes generated, and a breakdown by plan/method within window.
 */
export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  const url  = new URL(req.url);
  const from = url.searchParams.get('from') ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const to   = url.searchParams.get('to')   ?? new Date().toISOString();

  try {
    const [{ data: newUsers }, { data: payments }, { data: barcodes }] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, username, subscription_type, created_at, user_type')
        .gte('created_at', from).lte('created_at', to).eq('user_type', 'user'),
      supabaseAdmin.from('payments').select('reference, plan, amount_usd, method, status, created_at, paid_at')
        .gte('created_at', from).lte('created_at', to),
      supabaseAdmin.from('variations').select('id, created_at')
        .gte('created_at', from).lte('created_at', to),
    ]);

    const paidPayments = (payments ?? []).filter(p => p.status === 'paid');
    const revenue       = paidPayments.reduce((s, p) => s + parseFloat(p.amount_usd ?? 0), 0);

    const byPlan = {};
    for (const p of paidPayments) {
      byPlan[p.plan] = byPlan[p.plan] ?? { plan: p.plan, count: 0, total: 0 };
      byPlan[p.plan].count += 1;
      byPlan[p.plan].total += parseFloat(p.amount_usd ?? 0);
    }
    const byMethod = { stripe: 0, paynow: 0 };
    for (const p of paidPayments) byMethod[p.method] = (byMethod[p.method] ?? 0) + parseFloat(p.amount_usd ?? 0);

    return j({
      range: { from, to },
      new_users:        (newUsers ?? []).length,
      new_barcodes:     (barcodes ?? []).length,
      revenue,
      paid_transactions: paidPayments.length,
      pending_transactions: (payments ?? []).filter(p => p.status === 'pending').length,
      by_plan:   Object.values(byPlan),
      by_method: byMethod,
      users:     newUsers ?? [],
      payments:  payments ?? [],
    });
  } catch (err) {
    console.error('[Admin reports]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/admin/reports' };
