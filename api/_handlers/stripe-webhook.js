/**
 * POST /api/stripe/webhook
 *
 * Handles:
 *   checkout.session.completed
 *     â†’ metadata.type === 'dev_wallet_topup'  â†’ credit developer wallet
 *     â†’ mode === 'subscription'               â†’ activate monthly subscription
 *     â†’ mode === 'payment'                    â†’ activate lifetime plan
 *   checkout.session.expired        â†’ mark pending payment cancelled
 *   invoice.paid                    â†’ renew monthly subscription (+1 month)
 *   customer.subscription.deleted   â†’ cancel/expire subscription
 */

import Stripe from 'stripe';
import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  const sig    = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBuf = Buffer.from(await req.arrayBuffer());
    event = stripe.webhooks.constructEvent(rawBuf, sig, secret);
  } catch (err) {
    console.error('[Stripe webhook] Signature verification failed:', err.message);
    return new Response('Webhook signature verification failed.', { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'checkout.session.expired':
        await markExpired(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionCancelled(event.data.object);
        break;
    }
    return j({ received: true });
  } catch (err) {
    console.error('[Stripe webhook] Handler error:', err.message);
    return j({ error: 'Webhook handler error' }, 500);
  }
};

// â”€â”€ Checkout session completed â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleCheckoutCompleted(session) {
  const meta = session.metadata ?? {};

  if (meta.type === 'dev_wallet_topup') {
    await handleWalletTopup(session);
    return;
  }

  // Both subscription and one-time payment modes land here
  const { plan, userId, reference } = meta;
  if (!plan || !userId) return;

  // Keep stripe_customer_id in sync — covers edge cases where checkout created it
  if (session.customer) {
    await supabaseAdmin.from('profiles')
      .update({ stripe_customer_id: session.customer })
      .eq('id', userId)
      .is('stripe_customer_id', null);
  }

  await upsertPayment({ reference, userId, plan, session, method: 'stripe', status: 'paid' });
  await activateSubscription({ userId, plan });
}

// â”€â”€ Developer wallet top-up â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleWalletTopup(session) {
  const { userId, amount, reference } = session.metadata ?? {};
  if (!userId || !amount) return;

  const usd = parseFloat(amount);
  if (isNaN(usd) || usd <= 0) return;

  const { data: result, error } = await supabaseAdmin.rpc('credit_wallet_balance', {
    p_user_id:     userId,
    p_amount:      usd,
    p_type:        'topup',
    p_reference:   reference ?? session.id,
    p_description: `Stripe top-up â€” $${usd.toFixed(2)} USD`,
  });

  if (error) {
    console.error('[Stripe webhook] wallet credit RPC error:', error.message);
    return;
  }
  console.log(`[Stripe webhook] Wallet topped up $${usd} for user ${userId}. Balance: $${result?.balance}`);
}

// â”€â”€ Monthly invoice renewal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleInvoicePaid(invoice) {
  // Only process renewals, not the initial invoice (which is handled by checkout.session.completed)
  if (invoice.billing_reason === 'subscription_create') return;

  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  const sub    = await stripe.subscriptions.retrieve(subscriptionId);
  const meta   = sub.metadata ?? {};
  const { plan, userId } = meta;

  if (!plan || !userId) return;

  const reference = `SCZ-RENEW-${userId}-${Date.now()}`;
  await upsertPayment({
    reference,
    userId,
    plan,
    method: 'stripe',
    status: 'paid',
    amountUsd: (invoice.amount_paid ?? 0) / 100,
    stripeRef: invoice.id,
  });
  await activateSubscription({ userId, plan });
  console.log(`[Stripe webhook] Renewed ${plan} for user ${userId}`);
}

// â”€â”€ Subscription cancelled â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function handleSubscriptionCancelled(sub) {
  const { userId } = sub.metadata ?? {};
  if (!userId) return;

  await supabaseAdmin.from('profiles')
    .update({ subscription_type: 'free', subscription_end_date: null })
    .eq('id', userId);

  console.log(`[Stripe webhook] Subscription cancelled for user ${userId}`);
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function upsertPayment({ reference, userId, plan, session, method, status, amountUsd, stripeRef }) {
  const amount = amountUsd ?? (session ? (session.amount_total ?? 0) / 100 : 0);
  const ref    = stripeRef ?? (session ? (session.payment_intent ?? session.id) : null);

  await supabaseAdmin.from('payments').upsert({
    reference,
    user_id:    userId,
    plan,
    amount_usd: amount,
    method,
    stripe_pi:  ref,
    status,
    paid_at:    new Date().toISOString(),
  }, { onConflict: 'reference' });
}

async function activateSubscription({ userId, plan }) {
  const isLifetime = plan === 'lifetime';
  const update     = { subscription_type: plan };

  if (!isLifetime) {
    update.subscription_end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else {
    update.subscription_end_date = null;
  }

  await supabaseAdmin.from('profiles').update(update).eq('id', userId);
  console.log(`[Stripe webhook] Activated ${plan} for user ${userId}${isLifetime ? ' (lifetime)' : ''}`);
}

async function markExpired(session) {
  const { reference } = session.metadata ?? {};
  if (!reference) return;
  await supabaseAdmin.from('payments')
    .update({ status: 'cancelled' })
    .eq('reference', reference)
    .eq('status', 'pending');
}

export const config = { path: '/api/stripe/webhook' };
