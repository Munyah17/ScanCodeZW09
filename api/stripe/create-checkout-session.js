/**
 * POST /api/stripe/create-checkout-session
 *
 * Creates a Stripe Checkout Session and returns its URL.
 * The client redirects the browser to that URL — Stripe handles the card form,
 * 3D Secure, receipts, and all PCI compliance on their hosted page.
 *
 * Body:    { plan, userId, email, reference? }
 * Returns: { url }  ← redirect the browser here
 *
 * Test card: 4242 4242 4242 4242  exp: any future date  cvc: any 3 digits
 */

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

const PLAN_AMOUNTS_CENTS = {
  starter:  159,
  business: 499,
  pro:      1199,
};

const PLAN_NAMES = {
  starter:  'ScanCodeZW Starter Plan',
  business: 'ScanCodeZW Business Plan',
  pro:      'ScanCodeZW Pro Plan',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan, userId, email, reference: clientRef } = req.body ?? {};

  if (!plan || !PLAN_AMOUNTS_CENTS[plan]) {
    return res.status(400).json({ error: `Invalid plan: "${plan}"` });
  }
  if (!userId || !email) {
    return res.status(400).json({ error: 'userId and email are required' });
  }

  const reference  = clientRef ?? `SCZ-${userId}-${Date.now()}`;
  const appUrl     = process.env.APP_URL ?? 'http://localhost:3000';
  const successUrl = `${process.env.STRIPE_SUCCESS_URL ?? `${appUrl}/payment/return`}?reference=${encodeURIComponent(reference)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl  = process.env.STRIPE_CANCEL_URL ?? `${appUrl}/payment/cancel`;

  try {
    const session = await stripe.checkout.sessions.create({
      mode:           'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency:     'usd',
            unit_amount:  PLAN_AMOUNTS_CENTS[plan],
            product_data: { name: PLAN_NAMES[plan] },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url:  cancelUrl,
      metadata:    { plan, userId, reference },
      // Allow card payments only — no wallets, no bank redirects
      payment_method_types: ['card'],
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] create-checkout-session error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
