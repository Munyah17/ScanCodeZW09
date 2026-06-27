import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  try {
    const { data: users } = await supabaseAdmin
      .from('profiles')
      .select('created_at, subscription_type, user_type')
      .order('created_at', { ascending: true });

    const { data: barcodes } = await supabaseAdmin
      .from('variations')
      .select('created_at')
      .order('created_at', { ascending: true });

    // User growth by month (last 12)
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        year: d.getFullYear(), month: d.getMonth() + 1,
        new_users: 0, new_barcodes: 0,
      });
    }

    for (const u of users ?? []) {
      const d = new Date(u.created_at);
      const slot = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth() + 1);
      if (slot) slot.new_users += 1;
    }
    for (const b of barcodes ?? []) {
      const d = new Date(b.created_at);
      const slot = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth() + 1);
      if (slot) slot.new_barcodes += 1;
    }

    // Subscription distribution
    const subDist = {};
    for (const u of (users ?? []).filter(u => u.user_type === 'user')) {
      const k = u.subscription_type ?? 'free';
      subDist[k] = (subDist[k] ?? 0) + 1;
    }

    // Role distribution
    const roleDist = {};
    for (const u of users ?? []) {
      roleDist[u.user_type] = (roleDist[u.user_type] ?? 0) + 1;
    }

    return j({
      monthly_trend:      months,
      subscription_dist:  Object.entries(subDist).map(([name, value]) => ({ name, value })),
      role_dist:          Object.entries(roleDist).map(([name, value]) => ({ name, value })),
      total_users:        (users ?? []).length,
      total_barcodes:     (barcodes ?? []).length,
    });
  } catch (err) {
    console.error('[Admin analytics]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/admin/analytics' };
