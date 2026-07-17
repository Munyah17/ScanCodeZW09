import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

/**
 * GET /api/admin/accounting
 * All account-related financial data: revenue recognized, outstanding
 * (pending) payments, refunded/cancelled amounts, and a monthly ledger.
 */
export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('reference, plan, amount_usd, method, status, created_at, paid_at, user_id, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(1000);

    const rows = payments ?? [];
    const sum  = (list) => list.reduce((s, p) => s + parseFloat(p.amount_usd ?? 0), 0);

    const paid      = rows.filter(r => r.status === 'paid');
    const pending   = rows.filter(r => r.status === 'pending');
    const refunded  = rows.filter(r => r.status === 'refunded');
    const cancelled = rows.filter(r => r.status === 'cancelled' || r.status === 'disputed');

    // Monthly ledger (last 12 months)
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('default', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth() + 1, revenue: 0, refunded: 0 });
    }
    for (const p of paid.filter(r => r.paid_at)) {
      const d = new Date(p.paid_at);
      const slot = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth() + 1);
      if (slot) slot.revenue += parseFloat(p.amount_usd ?? 0);
    }
    for (const p of refunded) {
      const d = new Date(p.created_at);
      const slot = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth() + 1);
      if (slot) slot.refunded += parseFloat(p.amount_usd ?? 0);
    }

    return j({
      net_revenue:        sum(paid),
      outstanding:         sum(pending),
      refunded_total:      sum(refunded),
      cancelled_total:     sum(cancelled),
      transaction_counts: { paid: paid.length, pending: pending.length, refunded: refunded.length, cancelled: cancelled.length },
      monthly_ledger:     months,
      transactions:       rows,
    });
  } catch (err) {
    console.error('[Admin accounting]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/admin/accounting' };
