/**
 * POST /api/paynow/callback
 * Paynow POSTs URL-encoded payment status updates here (the passive
 * confirmation path — Result URL). See payments-status.js for the active
 * poll-URL fallback, used when this callback is delayed or dropped.
 * Set PAYNOW_RESULT_URL=https://www.scancode.co.zw/api/paynow/callback
 */

import { verifyCallback }        from '../_utils/paynow.js';
import { supabaseAdmin }         from '../_utils/supabase-admin.js';
import { activatePaynowPayment } from '../_utils/activate-payment.js';

export default async (req) => {
  if (req.method !== 'POST') return new Response('OK', { status: 200 });

  // Paynow sends application/x-www-form-urlencoded
  const text   = await req.text();
  const params = Object.fromEntries(new URLSearchParams(text));

  const valid = verifyCallback(params, process.env.PAYNOW_INTEGRATION_KEY);
  if (!valid) {
    console.warn('[Paynow callback] Invalid hash — possible forgery. Params:', params);
    return new Response('Invalid hash', { status: 400 });
  }

  const { reference, status, amount, paynowreference } = params;
  const normalizedStatus = (status ?? '').toLowerCase();

  console.log(`[Paynow callback] reference=${reference} status=${normalizedStatus}`);

  if (normalizedStatus === 'paid' || normalizedStatus === 'awaiting delivery') {
    await activatePaynowPayment(reference, amount, paynowreference);
  } else if (['cancelled', 'disputed', 'refunded'].includes(normalizedStatus)) {
    await supabaseAdmin.from('payments').update({ status: normalizedStatus }).eq('reference', reference);
  }

  return new Response('OK', { status: 200 });
};

export const config = { path: '/api/paynow/callback' };
