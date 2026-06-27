import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('id, reference, plan, amount_usd, method, status, paid_at, created_at, user_id, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(500);

    const rows = payments ?? [];

    // Monthly trend (last 12 months)
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ label: d.toLocaleString('default', { month: 'short', year: '2-digit' }), year: d.getFullYear(), month: d.getMonth() + 1, stripe: 0, paynow: 0 });
    }
    for (const p of rows.filter(r => r.status === 'paid' && r.paid_at)) {
      const d = new Date(p.paid_at);
      const slot = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth() + 1);
      if (slot) {
        const amt = parseFloat(p.amount_usd ?? 0);
        if (p.method === 'stripe')  slot.stripe  += amt;
        else                        slot.paynow  += amt;
      }
    }

    // By-plan breakdown
    const byPlan = {};
    for (const p of rows.filter(r => r.status === 'paid')) {
      if (!byPlan[p.plan]) byPlan[p.plan] = { plan: p.plan, count: 0, total: 0 };
      byPlan[p.plan].count += 1;
      byPlan[p.plan].total += parseFloat(p.amount_usd ?? 0);
    }

    // Gateway split
    let stripe_total = 0, paynow_total = 0;
    for (const p of rows.filter(r => r.status === 'paid')) {
      const amt = parseFloat(p.amount_usd ?? 0);
      if (p.method === 'stripe') stripe_total += amt; else paynow_total += amt;
    }

    return j({
      transactions:   rows,
      monthly_trend:  months,
      by_plan:        Object.values(byPlan),
      stripe_total,
      paynow_total,
      total:          stripe_total + paynow_total,
    });
  } catch (err) {
    console.error('[Admin revenue]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/admin/revenue' };
