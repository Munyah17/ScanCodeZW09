/**
 * POST /api/dev/topup
 * Body: { amount, gateway: 'stripe' | 'paynow' }
 *
 * Initiates a wallet top-up checkout session.
 * Both gateways redirect the user to the provider's hosted checkout —
 * we never collect or process payment information here.
 * On payment success the Stripe/Paynow webhook credits the wallet.
 */

import Stripe                from 'stripe';
import { initiateWebPayment } from '../_utils/paynow.js';
import { requireAuth }        from '../_utils/require-auth.js';
import { ensureWallet }       from '../_utils/wallet-ops.js';
import { j }                  from '../_utils/response.js';

const MIN_TOPUP = 5;
const MAX_TOPUP = 500;

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const { auth, error } = await requireAuth(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const { amount, gateway = 'stripe' } = body;
  const usd = parseFloat(amount);

  if (!usd || isNaN(usd) || usd < MIN_TOPUP || usd > MAX_TOPUP) {
    return j({ error: `amount must be between $${MIN_TOPUP} and $${MAX_TOPUP}.` }, 400);
  }
  if (!['stripe', 'paynow'].includes(gateway)) {
    return j({ error: "gateway must be 'stripe' or 'paynow'." }, 400);
  }

  await ensureWallet(auth.userId);

  const reference  = `DEV-TOPUP-${auth.userId}-${Date.now()}`;
  const appUrl     = process.env.APP_URL ?? 'https://scancodezw.netlify.app';
  const devUrl     = process.env.DEV_PORTAL_URL ?? `${appUrl}/dev`;
  const successUrl = `${devUrl}/wallet?topped_up=true&reference=${encodeURIComponent(reference)}`;
  const cancelUrl  = `${devUrl}/wallet`;

  // ── Stripe ──────────────────────────────────────────────────────────────────
  if (gateway === 'stripe') {
    if (!process.env.STRIPE_SECRET_KEY) {
      return j({ error: 'Card payments not configured.' }, 503);
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
    const cents  = Math.round(usd * 100);

    try {
      const session = await stripe.checkout.sessions.create({
        mode:           'payment',
        customer_email: auth.email ?? undefined,
        line_items: [{
          price_data: {
            currency:     'usd',
            unit_amount:  cents,
            product_data: { name: `ScanCodeZW Developer Wallet — $${usd.toFixed(2)} Top-up` },
          },
          quantity: 1,
        }],
        success_url: successUrl + '&session_id={CHECKOUT_SESSION_ID}',
        cancel_url:  cancelUrl,
        metadata:    { type: 'dev_wallet_topup', userId: auth.userId, amount: usd, reference },
      });
      return j({ success: true, url: session.url, reference });
    } catch (err) {
      console.error('[dev/topup stripe]', err.message);
      return j({ error: err.message }, 500);
    }
  }

  // ── Paynow (web redirect — Paynow hosts the entire checkout) ────────────────
  const integrationId  = process.env.PAYNOW_INTEGRATION_ID;
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;
  if (!integrationId || integrationId === 'REPLACE_ME') {
    return j({ error: 'Paynow not configured.' }, 503);
  }

  try {
    const result = await initiateWebPayment({
      integrationId,
      integrationKey,
      reference,
      amount:      usd,
      email:       auth.email ?? '',
      description: `ScanCodeZW Developer Wallet — $${usd.toFixed(2)} Top-up`,
      resultUrl:   process.env.PAYNOW_RESULT_URL ?? `${appUrl}/api/paynow/callback`,
      returnUrl:   successUrl,
    });

    if (!result.success) {
      console.error('[dev/topup paynow]', result.error);
      return j({ error: result.error || 'Paynow initiation failed.' }, 502);
    }

    return j({ success: true, redirectUrl: result.redirectUrl, reference });
  } catch (err) {
    console.error('[dev/topup paynow]', err.message);
    return j({ error: 'Failed to initiate Paynow payment.' }, 500);
  }
};

export const config = { path: '/api/dev/topup' };
