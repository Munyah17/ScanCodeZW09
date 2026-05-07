/**
 * GET  /api/admin/users  — list all users with counts
 * PATCH /api/admin/users — update a user's subscription / enterprise config
 * Requires admin JWT.
 */

import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  // ── GET: list users ─────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { data: profiles, error } = await supabaseAdmin
        .from('profiles')
        .select('id, username, subscription_type, subscription_end_date, enterprise_config, admin_notes, user_type, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const userIds = profiles.map(p => p.id);

      // Guard: Supabase `.in()` with an empty array returns all rows — skip if no users
      const [productRows, barcodeRows, authUserList] = await Promise.all([
        userIds.length
          ? supabaseAdmin.from('products').select('user_id').in('user_id', userIds).then(r => r.data ?? [])
          : Promise.resolve([]),
        userIds.length
          ? supabaseAdmin.from('variations').select('user_id').in('user_id', userIds).then(r => r.data ?? [])
          : Promise.resolve([]),
        supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }).then(r => r.data?.users ?? []),
      ]);

      const productMap = {};
      const barcodeMap = {};
      const emailMap   = {};

      for (const r of productRows)   productMap[r.user_id] = (productMap[r.user_id] ?? 0) + 1;
      for (const r of barcodeRows)   barcodeMap[r.user_id] = (barcodeMap[r.user_id] ?? 0) + 1;
      for (const u of authUserList)  emailMap[u.id]        = u.email;

      const enriched = profiles.map(p => ({
        ...p,
        email:         emailMap[p.id]   ?? '',
        product_count: productMap[p.id] ?? 0,
        barcode_count: barcodeMap[p.id] ?? 0,
      }));

      return res.status(200).json(enriched);
    } catch (err) {
      console.error('[Admin users GET]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PATCH: update subscription / enterprise config ───────────────────────────
  if (req.method === 'PATCH') {
    const { userId, subscription_type, subscription_end_date, enterprise_config, admin_notes } = req.body ?? {};

    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const validPlans = ['starter', 'business', 'pro', 'enterprise', 'custom'];
    if (subscription_type && !validPlans.includes(subscription_type)) {
      return res.status(400).json({ error: `Invalid plan: "${subscription_type}"` });
    }

    try {
      const update = { updated_at: new Date().toISOString(), override_by: admin.id };

      if (subscription_type      !== undefined) update.subscription_type      = subscription_type;
      if (subscription_end_date  !== undefined) update.subscription_end_date  = subscription_end_date || null;
      if (enterprise_config      !== undefined) update.enterprise_config      = enterprise_config;
      if (admin_notes            !== undefined) update.admin_notes            = admin_notes;

      const { error } = await supabaseAdmin
        .from('profiles')
        .update(update)
        .eq('id', userId);

      if (error) throw error;
      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('[Admin users PATCH]', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
