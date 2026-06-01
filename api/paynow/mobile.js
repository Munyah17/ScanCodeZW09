/**
 * POST /api/paynow/mobile
 * Body: { plan, phone, method }
 *   method: 'ecocash' | 'onemoney'
 * Returns: { success, reference, instructions, pollUrl }
 *
 * Uses Paynow's mobile USSD-push flow.
 * A USSD prompt is sent to the customer's phone — they approve with their PIN.
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

const SUPPORTED_METHODS = ['ecocash', 'onemoney'];

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

  const { plan, phone, method = 'onemoney' } = body;

  if (!plan || !PLAN_AMOUNTS[plan])            return j({ error: `Invalid plan: "${plan}"` }, 400);
  if (!phone)                                   return j({ error: 'phone is required' }, 400);
  if (!SUPPORTED_METHODS.includes(method)) {
    return j({ error: `Unsupported mobile method: "${method}". Use ecocash or onemoney.` }, 400);
  }

  const userId    = auth.userId;
  const email     = auth.email ?? '';
  const reference = `SCZ-${userId}-${Date.now()}`;
  const appUrl    = process.env.APP_URL ?? 'http://localhost:8888';

  const paynow = new Paynow(integrationId, integrationKey);
  paynow.resultUrl = process.env.PAYNOW_RESULT_URL ?? `${appUrl}/api/paynow/callback`;
  paynow.returnUrl = process.env.PAYNOW_RETURN_URL ?? `${appUrl}/payment/return`;

  const payment = paynow.createPayment(reference, email);
  payment.add(PLAN_LABELS[plan], PLAN_AMOUNTS[plan]);

  try {
    const response = await paynow.sendMobile(payment, phone, method);

    if (!response.success) {
      console.error(`[Paynow Mobile/${method}] failed:`, response.error);
      return j({ error: response.error || 'Mobile payment request failed.' }, 502);
    }

    await supabaseAdmin.from('payments').insert({
      reference,
      user_id:         userId,
      plan,
      amount_usd:      PLAN_AMOUNTS[plan],
      method,
      paynow_poll_url: response.pollUrl ?? null,
      status:          'pending',
      meta:            JSON.stringify({ phone, email }),
    }).catch(err => console.warn('[Paynow Mobile] Supabase insert warning:', err.message));

    return j({
      success:      true,
      reference,
      instructions: response.instructions,
      pollUrl:      response.pollUrl,
    });

  } catch (err) {
    console.error('[Paynow Mobile] error:', err.message);
    return j({ error: 'Failed to send mobile payment request. Please try again.' }, 500);
  }
};

export const config = { path: '/api/paynow/mobile' };
