import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';
import { isValidUuid }   from '../_utils/validate.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  const product_id = new URL(req.url).searchParams.get('product_id');
  if (!isValidUuid(product_id)) return j({ error: 'Invalid product_id.' }, 400);

  try {
    const [{ data: product }, { data: variations }] = await Promise.all([
      supabaseAdmin.from('products')
        .select('id, product_name')
        .eq('id', product_id)
        .eq('user_id', auth.userId)
        .single(),
      supabaseAdmin.from('variations')
        .select('id, variation_type, variation_value, barcode_data, barcode_format, created_at')
        .eq('product_id', product_id)
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: true }),
    ]);

    if (!product) return j({ error: 'Product not found.' }, 404);
    return j({ product, variations: variations ?? [] });
  } catch (err) {
    console.error('[products/variations]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/products/variations' };
