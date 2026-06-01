/**
 * POST /api/stripe/webhook
 * Handles two event types:
 *   checkout.session.completed
 *     → metadata.type === 'dev_wallet_topup'  → credit developer wallet
 *     → (else)                                → activate subscription
 *   checkout.session.expired → mark pending payment cancelled
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
    return new Response(`Webhook error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCompleted(event.data.object);
        break;
      case 'checkout.session.expired':
        await markExpired(event.data.object);
        break;
    }
    return j({ received: true });
  } catch (err) {
    console.error('[Stripe webhook] Handler error:', err.message);
    return j({ error: 'Webhook handler error' }, 500);
  }
};

// ── Route completed sessions ──────────────────────────────────────────────────
async function handleCompleted(session) {
  const meta = session.metadata ?? {};

  if (meta.type === 'dev_wallet_topup') {
    await handleWalletTopup(session);
  } else {
    await handleSubscription(session);
  }
}

// ── Developer wallet top-up ───────────────────────────────────────────────────
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
    p_description: `Stripe top-up — $${usd.toFixed(2)} USD`,
  });

  if (error) {
    console.error('[Stripe webhook] wallet credit RPC error:', error.message);
    return;
  }

  console.log(`[Stripe webhook] Wallet topped up $${usd} for user ${userId}. New balance: $${result?.balance}`);
}

// ── Subscription activation ───────────────────────────────────────────────────
async function handleSubscription(session) {
  const { plan, userId, reference } = session.metadata ?? {};
  if (!plan || !userId) return;

  await supabaseAdmin.from('payments').upsert({
    reference,
    user_id:    userId,
    plan,
    amount_usd: (session.amount_total ?? 0) / 100,
    method:     'stripe',
    stripe_pi:  session.payment_intent ?? session.id,
    status:     'paid',
    paid_at:    new Date().toISOString(),
  }, { onConflict: 'reference' });

  const isLifetime = plan === 'lifetime';
  const update     = { subscription_type: plan };
  if (!isLifetime) {
    const end = new Date();
    end.setMonth(end.getMonth() + 1);
    update.subscription_end_date = end.toISOString();
  } else {
    update.subscription_end_date = null;
  }

  await supabaseAdmin.from('profiles').update(update).eq('id', userId);
  console.log(`[Stripe webhook] Activated ${plan} for user ${userId}${isLifetime ? ' (lifetime)' : ''}`);
}

// ── Expired sessions ──────────────────────────────────────────────────────────
async function markExpired(session) {
  const { reference } = session.metadata ?? {};
  if (!reference) return;
  await supabaseAdmin.from('payments')
    .update({ status: 'cancelled' })
    .eq('reference', reference)
    .eq('status', 'pending');
}

export const config = { path: '/api/stripe/webhook' };
