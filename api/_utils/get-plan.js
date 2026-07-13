import { supabaseAdmin } from './supabase-admin.js';

/**
 * Single source of truth for what a plan costs and how it should be billed.
 * Both Stripe and Paynow checkout initiation read from here — editing a row
 * in subscription_plans (via the Super Admin Pricing page) is what actually
 * changes what a customer is charged, not a hardcoded map in each handler.
 */
export async function getPlan(planKey) {
  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, name, price_usd, billing_type, otg_credits, active')
    .eq('id', planKey)
    .maybeSingle();

  if (error || !data || !data.active || data.price_usd == null) return null;
  return data;
}
