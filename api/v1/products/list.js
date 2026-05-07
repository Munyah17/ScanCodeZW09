import { requireApiKey }  from '../../_utils/require-api-key.js';
import { supabaseAdmin } from '../../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end(); return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' }); return;
  }

  const auth = await requireApiKey(req, res, 'read:products');
  if (!auth) return;

  const { limit = '50', offset = '0' } = req.query;
  const lim = Math.min(parseInt(limit, 10) || 50, 200);
  const off = parseInt(offset, 10) || 0;

  const { data, count, error } = await supabaseAdmin
    .from('products')
    .select('id, product_name, category, created_at', { count: 'exact' })
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .range(off, off + lim - 1);

  if (error) { res.status(500).json({ error: error.message }); return; }

  res.status(200).json({
    products: data ?? [],
    total:    count ?? 0,
    limit:    lim,
    offset:   off,
  });
}
