import { requireAuth }   from './_utils/require-auth.js';
import { supabaseAdmin } from './_utils/supabase-admin.js';
import { j }             from './_utils/response.js';

const PAGE_SIZE = 50;

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const params = new URL(req.url).searchParams;
  const limit  = Math.min(parseInt(params.get('limit')  ?? String(PAGE_SIZE), 10) || PAGE_SIZE, 200);
  const offset = Math.max(parseInt(params.get('offset') ?? '0', 10) || 0, 0);

  try {
    const [{ data: vars, error: varErr }, { data: prods }] = await Promise.all([
      supabaseAdmin.from('variations')
        .select('id, barcode_data, barcode_format, barcode_country, qrcode_generated, qr_code_url, variation_type, variation_value, product_id, created_at')
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabaseAdmin.from('products')
        .select('id, product_name')
        .eq('user_id', auth.userId),
    ]);

    if (varErr) throw varErr;

    const productMap = (prods ?? []).reduce((acc, p) => { acc[p.id] = p.product_name; return acc; }, {});

    return j({
      barcodes:  (vars ?? []).map(v => ({ ...v, product_name: productMap[v.product_id] ?? 'Unknown' })),
      products:  productMap,
      has_more:  (vars ?? []).length === limit,
    });
  } catch (err) {
    console.error('[barcodes/my-list]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/barcodes/my-list' };
