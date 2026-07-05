import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';
import { isValidLength, firstError } from '../_utils/validate.js';

const STAFF_ROLES = new Set(['admin', 'super_admin', 'technical_support', 'clerk', 'assistant', 'finance']);

const PLAN_DEFAULTS = {
  free:       { max_products: 1,    max_variations_per_product: 1    },
  starter:    { max_products: 3,    max_variations_per_product: 3    },
  business:   { max_products: 20,   max_variations_per_product: 15   },
  pro:        { max_products: 100,  max_variations_per_product: 50   },
  lifetime:   { max_products: null, max_variations_per_product: null },
  enterprise: { max_products: null, max_variations_per_product: null },
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const {
    existing_product_id,
    product_name,
    category,
    variation_type,
    variation_value,
    barcode_data,
    barcode_format,
    barcode_country,
    generate_qrcode,
  } = body;

  const hasNewProduct = !existing_product_id;
  const valErr = firstError([
    { check: hasNewProduct ? isValidLength(product_name, 1, 200) : true,  msg: 'Product name must be 1â€“200 characters.'  },
    { check: isValidLength(variation_type,  1, 100),                      msg: 'Variation type must be 1â€“100 characters.' },
    { check: isValidLength(variation_value, 1, 200),                      msg: 'Variation value must be 1â€“200 characters.'},
    { check: isValidLength(barcode_data,    8, 20),                       msg: 'Invalid barcode data.'                    },
  ]);
  if (valErr) return j({ error: valErr }, 400);

  const isStaff = STAFF_ROLES.has(auth.profile?.user_type);

  try {
    const { data: plan } = await supabaseAdmin
      .from('subscription_plans')
      .select('max_products, max_variations_per_product')
      .eq('id', auth.profile.subscription_type)
      .maybeSingle();

    const fallback = PLAN_DEFAULTS[auth.profile.subscription_type] ?? PLAN_DEFAULTS.starter;
    const ec = auth.profile.enterprise_config ?? {};

    const rawMaxP = ec.max_products   ?? plan?.max_products               ?? fallback.max_products;
    const rawMaxV = ec.max_variations ?? plan?.max_variations_per_product ?? fallback.max_variations_per_product;
    const maxProducts   = isStaff || rawMaxP === null ? null : rawMaxP;
    const maxVariations = isStaff || rawMaxV === null ? null : rawMaxV;

    let productId = existing_product_id ? Number(existing_product_id) : null;
    let actualProductName = '';

    if (!productId) {
      if (maxProducts !== null) {
        const { count: prodCount } = await supabaseAdmin
          .from('products')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', auth.userId);
        if ((prodCount ?? 0) >= maxProducts) {
          return j({ error: 'Product limit reached for your plan. Please upgrade.' }, 400);
        }
      }

      const { data: newProduct, error: productErr } = await supabaseAdmin
        .from('products')
        .insert({ user_id: auth.userId, product_name: product_name.trim(), category: category?.trim() || null })
        .select()
        .single();
      if (productErr) throw productErr;
      productId         = newProduct.id;
      actualProductName = newProduct.product_name;
    } else {
      const { data: prod } = await supabaseAdmin
        .from('products')
        .select('id, product_name')
        .eq('id', productId)
        .eq('user_id', auth.userId)
        .single();
      if (!prod) return j({ error: 'Product not found.' }, 404);
      actualProductName = prod.product_name;
    }

    if (maxVariations !== null) {
      const { count: varCount } = await supabaseAdmin
        .from('variations')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId);
      if ((varCount ?? 0) >= maxVariations) {
        return j({ error: 'Variation limit reached for this product. Please upgrade.' }, 400);
      }
    }

    const { data: newVariation, error: varErr } = await supabaseAdmin
      .from('variations')
      .insert({
        product_id:       productId,
        user_id:          auth.userId,
        variation_type:   variation_type.trim(),
        variation_value:  variation_value.trim(),
        barcode_data,
        barcode_format,
        barcode_country,
        qrcode_generated: generate_qrcode ?? false,
      })
      .select()
      .single();
    if (varErr) throw varErr;

    return j({ variation: { ...newVariation, product_name: actualProductName } });
  } catch (err) {
    console.error('[barcodes/save]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/barcodes/save' };
