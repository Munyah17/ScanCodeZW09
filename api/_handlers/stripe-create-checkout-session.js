import Stripe from 'stripe';
import { requireAuth }   from '../_utils/require-auth.js';
import { j }             from '../_utils/response.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';

const PLAN_AMOUNTS_CENTS = {
  starter:    590,
  business:   1690,
  pro:        2990,
  lifetime:   12999,
  otg_single: 1000,
  otg_triple: 2000,
};
const PLAN_NAMES = {
  starter:    'ScanCodeZW Starter Plan',
  business:   'ScanCodeZW Business Plan',
  pro:        'ScanCodeZW Pro Plan',
  lifetime:   'ScanCodeZW Lifetime Access',
  otg_single: 'ScanCodeZW – 1 Barcode Generation',
  otg_triple: 'ScanCodeZW – 3 Barcode Generations',
};
const ONE_TIME_PLANS = new Set(['lifetime', 'otg_single', 'otg_triple']);

export default async (req) => {
  try {
    if (req.method === 'OPTIONS') return new Response('', { status: 200 });
    if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_REPLACE_ME') {
      return j({ error: 'Card payments are not yet configured. Please use mobile money or contact support.' }, 503);
    }

    const { auth, error: authErr } = await requireAuth(req);
    if (authErr) return authErr;

    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { plan, reference: clientRef } = body;

    if (!plan || !PLAN_AMOUNTS_CENTS[plan]) return j({ error: `Invalid plan: "${plan}"` }, 400);

    const userId    = auth.userId;
    const email     = auth.profile?.email ?? auth.email ?? '';
    const reference = clientRef ?? `SCZ-${userId}-${Date.now()}`;
    const appUrl    = process.env.APP_URL ?? 'https://scancodezw.netlify.app';
    const successUrl = `${process.env.STRIPE_SUCCESS_URL ?? `${appUrl}/payment/return`}?reference=${encodeURIComponent(reference)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${process.env.STRIPE_CANCEL_URL ?? `${appUrl}/payment/cancel`}?plan=${encodeURIComponent(plan)}`;
    const isOneTime  = ONE_TIME_PLANS.has(plan);

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

    // Insert pending record before calling Stripe — reference exists in DB before redirect
    await supabaseAdmin.from('payments').insert({
      reference,
      user_id:    userId,
      plan,
      amount_usd: PLAN_AMOUNTS_CENTS[plan] / 100,
      method:     'stripe',
      status:     'pending',
    });

    // Get or create Stripe Customer — gracefully skip if profile lookup fails
    let stripeCustomerId = null;
    try {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('stripe_customer_id')
        .eq('id', userId)
        .single();
      stripeCustomerId = profile?.stripe_customer_id ?? null;
    } catch { /* non-fatal — continue without customer ID */ }

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ email: email || undefined, metadata: { userId } });
      stripeCustomerId = customer.id;
      // Save in background — don't block checkout
      supabaseAdmin.from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', userId)
        .then(({ error }) => { if (error) console.warn('[Stripe] customer ID save:', error.message); });
    }

    const sessionParams = {
      customer:             stripeCustomerId,
      success_url:          successUrl,
      cancel_url:           cancelUrl,
      metadata:             { plan, userId, reference },
      payment_method_types: ['card'],
    };

    if (isOneTime) {
      sessionParams.mode = 'payment';
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

    // Update stripe session ID in background — URL is all the client needs now
    supabaseAdmin.from('payments')
      .update({ stripe_pi: session.id })
      .eq('reference', reference)
      .then(({ error }) => { if (error) console.warn('[Stripe] session ID update:', error.message); });

    return j({ url: session.url });

  } catch (err) {
    console.error('[Stripe] unhandled error:', err.message, err.stack);
    return j({ error: err.message || 'Stripe checkout failed.' }, 500);
  }
};

export const config = { path: '/api/stripe/create-checkout-session' };
