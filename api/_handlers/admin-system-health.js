import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

/**
 * GET /api/admin/system-health
 * Real, honest system metrics — no fabricated numbers. DB latency and table
 * row counts are measured live; recent errors are read from api_usage_logs
 * (populated by the Developer Portal's API key usage, the only place this
 * app currently logs per-request status codes).
 */
export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  const dbStart = Date.now();
  let dbOk = false;
  try {
    const { error: pingErr } = await supabaseAdmin.from('subscription_plans').select('id').limit(1).single();
    dbOk = !pingErr;
  } catch { /* dbOk stays false */ }
  const dbLatencyMs = Date.now() - dbStart;

  try {
    const [
      { count: userCount },
      { count: productCount },
      { count: variationCount },
      { count: paymentCount },
      { data: recentUsage },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('variations').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('payments').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('api_usage_logs').select('status_code, created_at').order('created_at', { ascending: false }).limit(200),
    ]);

    const usage       = recentUsage ?? [];
    const errorCount  = usage.filter(u => u.status_code >= 500).length;
    const errorRate   = usage.length ? Math.round((errorCount / usage.length) * 1000) / 10 : null;

    return j({
      status:            dbOk ? 'operational' : 'degraded',
      database: {
        connected:  dbOk,
        latency_ms: dbLatencyMs,
      },
      table_counts: {
        users:      userCount ?? 0,
        products:   productCount ?? 0,
        variations: variationCount ?? 0,
        payments:   paymentCount ?? 0,
      },
      api_usage_sample: {
        sample_size: usage.length,
        error_rate_pct: errorRate,
        note: usage.length === 0 ? 'No Developer API traffic recorded yet.' : null,
      },
      checked_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Admin system-health]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/admin/system-health' };
