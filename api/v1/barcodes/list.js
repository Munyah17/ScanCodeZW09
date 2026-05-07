import { requireApiKey }  from '../../_utils/require-api-key.js';
import { supabaseAdmin } from '../../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end(); return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' }); return;
  }

  const auth = await requireApiKey(req, res, 'read:barcodes');
  if (!auth) return;

  const { limit = '50', offset = '0', product_id } = req.query;
  const lim = Math.min(parseInt(limit, 10) || 50, 200);
  const off = parseInt(offset, 10) || 0;

  let query = supabaseAdmin
    .from('variations')
    .select(`
      id, variation_type, variation_value, barcode_data,
      barcode_format, barcode_country, qrcode_generated, created_at,
      products:product_id (id, product_name, category)
    `, { count: 'exact' })
    .eq('user_id', auth.userId)
    .order('created_at', { ascending: false })
    .range(off, off + lim - 1);

  if (product_id) query = query.eq('product_id', product_id);

  const { data, count, error } = await query;
  if (error) { res.status(500).json({ error: error.message }); return; }

  res.status(200).json({
    barcodes: data ?? [],
    total:    count ?? 0,
    limit:    lim,
    offset:   off,
  });
}
