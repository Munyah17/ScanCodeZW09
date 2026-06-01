/**
 * POST /api/paynow/initiate
 * Body: { plan, reference? }
 * Returns: { success, redirectUrl, reference }
 *
 * Web-redirect flow: user is sent to Paynow's hosted checkout page.
 * Paynow handles method selection (card, EcoCash, OneMoney, InnBucks, ZIPIT).
 */

import { createRequire } from 'module';
import { requireAuth }   from '../_utils/require-auth.js';
import { j }             from '../_utils/response.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';

const require = createRequire(import.meta.url);
const { Paynow } = require('paynow');

const PLAN_AMOUNTS = { starter: 4.79, business: 11.99, pro: 24.99, lifetime: 129.99 };
const PLAN_LABELS  = {
  starter:  'ScanCodeZW Starter Plan',
  business: 'ScanCodeZW Business Plan',
  pro:      'ScanCodeZW Pro Plan',
  lifetime: 'ScanCodeZW Lifetime Plan',
};

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST')   return j({ error: 'Method not allowed' }, 405);

  const integrationId  = process.env.PAYNOW_INTEGRATION_ID;
  const integrationKey = process.env.PAYNOW_INTEGRATION_KEY;

  if (!integrationId || integrationId === 'REPLACE_ME') {
    return j({ error: 'Paynow is not configured. Please contact support.' }, 503);
  }

  const { auth, error: authErr } = await requireAuth(req);
  if (authErr) return authErr;

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const { plan, reference: clientRef } = body;

  if (!plan || !PLAN_AMOUNTS[plan]) return j({ error: `Invalid plan: "${plan}"` }, 400);

  const userId    = auth.userId;
  const email     = auth.email ?? '';
  const reference = clientRef ?? `SCZ-${userId}-${Date.now()}`;
  const appUrl    = process.env.APP_URL ?? 'http://localhost:8888';

  const paynow = new Paynow(integrationId, integrationKey);
  paynow.resultUrl = process.env.PAYNOW_RESULT_URL ?? `${appUrl}/api/paynow/callback`;
  paynow.returnUrl = process.env.PAYNOW_RETURN_URL ?? `${appUrl}/payment/return?reference=${encodeURIComponent(reference)}`;

  const payment = paynow.createPayment(reference, email);
  payment.add(PLAN_LABELS[plan], PLAN_AMOUNTS[plan]);

  try {
    const response = await paynow.send(payment);

    if (!response.success) {
      console.error('[Paynow] initiate failed:', response.error);
      return j({ error: response.error || 'Paynow payment initiation failed.' }, 502);
    }

    await supabaseAdmin.from('payments').insert({
      reference,
      user_id:         userId,
      plan,
      amount_usd:      PLAN_AMOUNTS[plan],
      method:          'paynow',
      paynow_poll_url: response.pollUrl ?? null,
      status:          'pending',
    }).catch(err => console.warn('[Paynow] Supabase insert warning:', err.message));

    return j({ success: true, redirectUrl: response.redirectUrl, reference });

  } catch (err) {
    console.error('[Paynow] initiate error:', err.message);
    return j({ error: 'Failed to initiate Paynow payment. Please try again.' }, 500);
  }
};

export const config = { path: '/api/paynow/initiate' };
