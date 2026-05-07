/**
 * POST /api/stripe/webhook
 *
 * Stripe sends signed events here. We verify the signature using the
 * webhook signing secret, then act on relevant event types.
 *
 * Configure in Stripe Dashboard → Developers → Webhooks:
 *   Endpoint URL: https://your-app.vercel.app/api/stripe/webhook
 *   Events to send:
 *     - checkout.session.completed
 *     - checkout.session.expired
 */

import Stripe from 'stripe';
import { supabaseAdmin } from '../_utils/supabase-admin.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Vercel reads the raw body for you when you export the config below
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig     = req.headers['stripe-signature'];
  const secret  = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    // Collect the raw body buffer (Vercel streams it)
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err) {
    console.error('[Stripe webhook] Signature verification failed:', err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'checkout.session.expired': {
        const session = event.data.object;
        console.log('[Stripe webhook] Session expired:', session.id);
        await markSessionExpired(session);
        break;
      }
      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[Stripe webhook] Handler error:', err.message);
    return res.status(500).json({ error: 'Webhook handler error' });
  }
}

async function handleCheckoutCompleted(session) {
  const { plan, userId, reference } = session.metadata ?? {};
  if (!plan || !userId) return;

  // Record payment in Supabase
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

  // Activate subscription
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  await supabaseAdmin.from('profiles').update({
    subscription_type:     plan,
    subscription_end_date: endDate.toISOString(),
  }).eq('id', userId);

  console.log(`[Stripe webhook] Activated ${plan} for user ${userId}`);
}

async function markSessionExpired(session) {
  const { reference } = session.metadata ?? {};
  if (!reference) return;
  await supabaseAdmin.from('payments').update({ status: 'cancelled' })
    .eq('reference', reference)
    .eq('status', 'pending');
}

// Read the raw body from a Node.js IncomingMessage stream
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end',  ()    => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
