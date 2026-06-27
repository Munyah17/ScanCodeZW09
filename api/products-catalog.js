import { requireAuth }   from './_utils/require-auth.js';
import { supabaseAdmin } from './_utils/supabase-admin.js';
import { j }             from './_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  try {
    const [{ data: prods }, { data: vars }, { data: plan }] = await Promise.all([
      supabaseAdmin.from('products')
        .select('id, product_name, category, created_at')
        .eq('user_id', auth.userId)
        .order('created_at', { ascending: false }),
      supabaseAdmin.from('variations')
        .select('product_id')
        .eq('user_id', auth.userId),
      supabaseAdmin.from('subscription_plans')
        .select('*')
        .eq('id', auth.profile.subscription_type)
        .maybeSingle(),
    ]);

    const countByProduct = (vars ?? []).reduce((acc, v) => {
      acc[v.product_id] = (acc[v.product_id] || 0) + 1;
      return acc;
    }, {});

    return j({
      products: (prods ?? []).map(p => ({ ...p, variation_count: countByProduct[p.id] ?? 0 })),
      subscription: plan ?? null,
      barcode_count: (vars ?? []).length,
    });
  } catch (err) {
    console.error('[products/catalog]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/products/catalog' };
