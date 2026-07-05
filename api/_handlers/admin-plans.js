import { requireAdmin }  from '../_utils/require-admin.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });

  const { auth, error } = await requireAdmin(req);
  if (error) return error;

  if (req.method === 'GET') {
    const { data, error: dbErr } = await supabaseAdmin
      .from('subscription_plans')
      .select('*')
      .order('price_usd', { ascending: true, nullsLast: true });

    if (dbErr) return j({ error: 'Internal server error.' }, 500);
    return j(data);
  }

  if (req.method === 'PUT') {
    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { id, name, price_usd, max_products, max_variations_per_product, features, active } = body;

    if (!id) return j({ error: 'Plan id is required.' }, 400);

    const update = {};
    if (name                       !== undefined) update.name                       = name;
    if (price_usd                  !== undefined) update.price_usd                  = price_usd;
    if (max_products               !== undefined) update.max_products               = max_products;
    if (max_variations_per_product !== undefined) update.max_variations_per_product = max_variations_per_product;
    if (features                   !== undefined) update.features                   = features;
    if (active                     !== undefined) update.active                     = active;

    const { error: dbErr } = await supabaseAdmin.from('subscription_plans').update(update).eq('id', id);
    if (dbErr) return j({ error: 'Internal server error.' }, 500);
    return j({ success: true });
  }

  return j({ error: 'Method not allowed' }, 405);
};

export const config = { path: '/api/admin/plans' };
