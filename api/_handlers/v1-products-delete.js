import { requireAuth }              from '../_utils/require-auth.js';
import { supabaseAdmin }            from '../_utils/supabase-admin.js';
import { j }                       from '../_utils/response.js';
import { isValidUuid, firstError } from '../_utils/validate.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'DELETE') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { productId } = body;

  const err = firstError([
    { check: isValidUuid(productId), msg: 'Invalid productId.' },
  ]);
  if (err) return j({ error: err }, 400);

  // Ownership check before deleting
  const { data: product } = await supabaseAdmin
    .from('products')
    .select('id')
    .eq('id', productId)
    .eq('user_id', auth.userId)
    .single();

  if (!product) return j({ error: 'Product not found.' }, 404);

  try {
    await supabaseAdmin.from('variations').delete().eq('product_id', productId);
    const { error: dbErr } = await supabaseAdmin.from('products').delete().eq('id', productId).eq('user_id', auth.userId);
    if (dbErr) throw dbErr;
    return j({ success: true });
  } catch (err) {
    console.error('[v1/products/delete]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/v1/products/delete' };
