/**
 * POST /api/paynow/callback
 *
 * Paynow calls this URL (your PAYNOW_RESULT_URL) when a payment status changes.
 * This endpoint MUST be publicly reachable. For local dev, use ngrok:
 *   npx ngrok http 3000
 *   then set PAYNOW_RESULT_URL=https://xxxx.ngrok.io/api/paynow/callback
 *
 * Paynow sends URL-encoded POST with fields:
 *   reference, amount, paynowreference, pollurl, status, hash
 *
 * We verify the hash before trusting the status.
 */

import { verifyCallback } from '../_utils/paynow.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // Paynow may also do a GET health-check
    return res.status(200).send('OK');
  }

  const params = req.body ?? {};

  // Verify the Paynow signature
  const valid = verifyCallback(params, process.env.PAYNOW_INTEGRATION_KEY);
  if (!valid) {
    console.warn('[Paynow callback] Invalid hash — possible forgery. Params:', params);
    return res.status(400).send('Invalid hash');
  }

  const { reference, status, amount, paynowreference } = params;
  const normalizedStatus = (status ?? '').toLowerCase();

  console.log(`[Paynow callback] reference=${reference} status=${normalizedStatus}`);

  if (normalizedStatus === 'paid' || normalizedStatus === 'awaiting delivery') {
    await activateFromReference(reference, normalizedStatus, amount, paynowreference);
  } else if (['cancelled', 'disputed', 'refunded'].includes(normalizedStatus)) {
    await supabaseAdmin
      .from('payments')
      .update({ status: normalizedStatus })
      .eq('reference', reference);
  }

  // Paynow expects a plain-text "OK" response
  return res.status(200).send('OK');
}

async function activateFromReference(reference, status, amount, paynowRef) {
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('user_id, plan, status')
    .eq('reference', reference)
    .single();

  if (!payment) {
    console.warn('[Paynow callback] Unknown reference:', reference);
    return;
  }

  if (payment.status === 'paid') return; // Already processed

  await supabaseAdmin.from('payments').update({
    status:          'paid',
    paynow_ref:      paynowRef,
    amount_usd:      parseFloat(amount) || payment.amount_usd,
    paid_at:         new Date().toISOString(),
  }).eq('reference', reference);

  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  await supabaseAdmin.from('profiles').update({
    subscription_type:     payment.plan,
    subscription_end_date: endDate.toISOString(),
  }).eq('id', payment.user_id);

  console.log(`[Paynow callback] Activated ${payment.plan} for user ${payment.user_id}`);
}
