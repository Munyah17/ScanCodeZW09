/**
 * POST /api/admin/migrate-plans
 *
 * One-shot endpoint: remaps old plan names (basic, premium, standard)
 * to the new naming convention (starter, business).
 * Safe to run multiple times — only touches rows that still have old names.
 * Requires admin JWT.
 */

import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';

const PLAN_MAP = {
  basic:    'starter',
  standard: 'starter',
  premium:  'business',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  try {
    const results = [];

    for (const [oldPlan, newPlan] of Object.entries(PLAN_MAP)) {
      const { data, error } = await supabaseAdmin
        .from('profiles')
        .update({ subscription_type: newPlan, updated_at: new Date().toISOString() })
        .eq('subscription_type', oldPlan)
        .select('id');

      results.push({ oldPlan, newPlan, migrated: data?.length ?? 0, error: error?.message });
    }

    const totalMigrated = results.reduce((s, r) => s + r.migrated, 0);
    return res.status(200).json({ success: true, total_migrated: totalMigrated, results });
  } catch (err) {
    console.error('[migrate-plans]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
