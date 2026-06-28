/**
 * POST /api/stripe/create-checkout-session
 * Body: { plan, reference? }
 *
 * Monthly plans use mode:'subscription' with recurring billing.
 * Lifetime uses mode:'payment' (one-time charge).
 *
 * Test card: 4242 4242 4242 4242  exp: any future  cvc: any 3 digits
 */

import Stripe from 'stripe';
import { requireAuth }   from './_utils/require-auth.js';
import { j }             from './_utils/response.js';
import { supabaseAdmin } from './_utils/supabase-admin.js';

const PLAN_AMOUNTS_CENTS = { starter: 479, business: 1199, pro: 2499, lifetime: 12999 };
const PLAN_NAMES = {
  starter:  'ScanCodeZW Starter Plan',
  business: 'ScanCodeZW Business Plan',
  pro:      'ScanCodeZW Pro Plan',
  lifetime: 'ScanCodeZW Lifetime Plan',
};
const ONE_TIME_PLANS = new Set(['lifetime']);

export default async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response('', { status: 200 });
    if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_REPLACE_ME') {
      return j({ error: 'Card payments are not yet configured. Please use mobile money or contact support.' }, 503);
    }

    const { auth, error: authErr } = await requireAuth(req);
    if (authErr) return authErr;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { plan, reference: clientRef } = body;

    if (!plan || !PLAN_AMOUNTS_CENTS[plan]) return j({ error: `Invalid plan: “${plan}”` }, 400);

    const userId    = auth.userId;
    const email     = auth.profile?.email ?? auth.email ?? '';
    const reference = clientRef ?? `SCZ-${userId}-${Date.now()}`;
    const appUrl    = process.env.APP_URL ?? 'https://scancodezw.netlify.app';
    const successUrl = `${process.env.STRIPE_SUCCESS_URL ?? `${appUrl}/payment/return`}?reference=${encodeURIComponent(reference)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${process.env.STRIPE_CANCEL_URL ?? `${appUrl}/payment/cancel`}?plan=${encodeURIComponent(plan)}`;
    const isOneTime  = ONE_TIME_PLANS.has(plan);

    // Get or create Stripe Customer — reuse on every subsequent checkout
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: email || undefined,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId);
    }

    const sessionParams = {
      customer:    stripeCustomerId,
      success_url: successUrl,
      cancel_url:  cancelUrl,
      metadata:    { plan, userId, reference },
    };

    if (isOneTime) {
      sessionParams.mode = 'payment';
      sessionParams.payment_method_types = ['card'];
      sessionParams.line_items = [{
        price_data: {
          currency:     'usd',
          unit_amount:  PLAN_AMOUNTS_CENTS[plan],
          product_data: { name: PLAN_NAMES[plan] },
        },
        quantity: 1,
      }];
    } else {
      sessionParams.mode = 'subscription';
      sessionParams.payment_method_types = ['card'];
      sessionParams.line_items = [{
        price_data: {
          currency:     'usd',
          unit_amount:  PLAN_AMOUNTS_CENTS[plan],
          product_data: { name: PLAN_NAMES[plan] },
          recurring:    { interval: 'month' },
        },
        quantity: 1,
      }];
      sessionParams.subscription_data = { metadata: { plan, userId, reference } };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    await supabaseAdmin.from('payments').upsert({
      reference,
      user_id:    userId,
      plan,
      amount_usd: PLAN_AMOUNTS_CENTS[plan] / 100,
      method:     'stripe',
      stripe_pi:  session.id,
      status:     'pending',
    }, { onConflict: 'reference' });

    return j({ url: session.url });

  } catch (err) {
    console.error('[Stripe] unhandled error:', err.message, err.stack);
    return j({ error: err.message || 'Stripe checkout failed.' }, 500);
  }
};

export const config = { path: '/api/stripe/create-checkout-session' };
