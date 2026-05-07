/**
 * GET /api/admin/plans  — list all subscription plans
 * PUT /api/admin/plans  — update a plan's price, limits, features
 * Requires admin JWT.
 */

import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('price_usd', { ascending: true, nullsLast: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const {
      id,
      name,
      price_usd,
      max_products,
      max_variations_per_product,
      features,
      active,
    } = req.body ?? {};

    if (!id) return res.status(400).json({ error: 'Plan id is required.' });

    const update = {};
    if (name                       !== undefined) update.name                       = name;
    if (price_usd                  !== undefined) update.price_usd                  = price_usd;
    if (max_products               !== undefined) update.max_products               = max_products;
    if (max_variations_per_product !== undefined) update.max_variations_per_product = max_variations_per_product;
    if (features                   !== undefined) update.features                   = features;
    if (active                     !== undefined) update.active                     = active;

    const { error } = await supabaseAdmin
      .from('subscription_plans')
      .update(update)
      .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
