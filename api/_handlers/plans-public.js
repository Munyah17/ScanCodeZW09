import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

/**
 * GET /api/plans/list — public, no auth required.
 * The single source of truth every pricing display (Landing, Pricing,
 * Settings, Dashboard, sidebar) reads from, so a price set in the Super
 * Admin Pricing tab shows up everywhere without a separate code change.
 */
export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, name, price_usd, billing_type, otg_credits, max_products, max_variations_per_product, features, active')
    .eq('active', true)
    .order('sort_order', { ascending: true, nullsLast: true });

  if (error) return j({ error: 'Internal server error.' }, 500);

  // vercel.json forces Cache-Control: no-store on every /api/* response —
  // deliberately so a Super Admin price edit is visible immediately
  // everywhere, not stale behind a CDN cache. Client-side caching (PlansContext)
  // is where request-count reduction happens instead.
  return j({ plans: data ?? [] });
};

export const config = { path: '/api/plans/list' };
