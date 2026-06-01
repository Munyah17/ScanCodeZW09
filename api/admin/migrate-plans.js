import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

const PLAN_MAP = { basic: 'starter', standard: 'starter', premium: 'business' };

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const { error } = await requireAdmin(req);
  if (error) return error;

  try {
    const results = [];
    for (const [oldPlan, newPlan] of Object.entries(PLAN_MAP)) {
      const { data, error: dbErr } = await supabaseAdmin
        .from('profiles')
        .update({ subscription_type: newPlan, updated_at: new Date().toISOString() })
        .eq('subscription_type', oldPlan)
        .select('id');
      results.push({ oldPlan, newPlan, migrated: data?.length ?? 0, error: dbErr?.message });
    }

    const totalMigrated = results.reduce((s, r) => s + r.migrated, 0);
    return j({ success: true, total_migrated: totalMigrated, results });
  } catch (err) {
    console.error('[migrate-plans]', err.message);
    return j({ error: err.message }, 500);
  }
};

export const config = { path: '/api/admin/migrate-plans' };
