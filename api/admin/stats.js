/**
 * GET /api/admin/stats
 * Returns platform-wide aggregate statistics.
 * Requires admin JWT in Authorization header.
 */

import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const [
      { count: totalUsers },
      { count: totalBarcodes },
      { data: subRows },
      { data: plans },
      { data: countryRows },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'user'),
      supabaseAdmin.from('variations').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('profiles').select('subscription_type').eq('user_type', 'user'),
      supabaseAdmin.from('subscription_plans').select('id, name, price_usd').order('price_usd', { ascending: true, nullsLast: true }),
      supabaseAdmin.from('variations').select('barcode_country').not('barcode_country', 'is', null),
    ]);

    // Subscription distribution
    const distribution = {};
    for (const r of subRows ?? []) {
      distribution[r.subscription_type] = (distribution[r.subscription_type] ?? 0) + 1;
    }

    // Revenue by plan
    const revenueByPlan = (plans ?? [])
      .filter(p => p.price_usd != null)
      .map(p => ({
        name:            p.name,
        price:           parseFloat(p.price_usd),
        user_count:      distribution[p.id] ?? 0,
        monthly_revenue: (distribution[p.id] ?? 0) * parseFloat(p.price_usd),
      }));

    const totalRevenue = revenueByPlan.reduce((sum, r) => sum + r.monthly_revenue, 0);

    // Country breakdown
    const countryCounts = {};
    for (const r of countryRows ?? []) {
      countryCounts[r.barcode_country] = (countryCounts[r.barcode_country] ?? 0) + 1;
    }
    const countryStats = Object.entries(countryCounts)
      .map(([barcode_country, count]) => ({ barcode_country, count }))
      .sort((a, b) => b.count - a.count);

    // Recent payments
    const { data: recentPayments } = await supabaseAdmin
      .from('payments')
      .select('reference, plan, amount_usd, method, status, paid_at, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    return res.status(200).json({
      total_users:               totalUsers ?? 0,
      total_barcodes:            totalBarcodes ?? 0,
      total_revenue:             totalRevenue,
      subscription_distribution: distribution,
      revenue_by_plan:           revenueByPlan,
      country_stats:             countryStats,
      recent_payments:           recentPayments ?? [],
    });
  } catch (err) {
    console.error('[Admin stats]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
