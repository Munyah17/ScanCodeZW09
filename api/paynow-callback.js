/**
 * POST /api/paynow/callback
 * Paynow POSTs URL-encoded payment status updates here.
 * Set PAYNOW_RESULT_URL=https://YOUR-SITE.netlify.app/api/paynow/callback
 */

import { verifyCallback } from './_utils/paynow.js';
import { supabaseAdmin }  from './_utils/supabase-admin.js';

export default async (req) => {
  if (req.method !== 'POST') return new Response('OK', { status: 200 });

  // Paynow sends application/x-www-form-urlencoded
  const text   = await req.text();
  const params = Object.fromEntries(new URLSearchParams(text));

  const valid = verifyCallback(params, process.env.PAYNOW_INTEGRATION_KEY);
  if (!valid) {
    console.warn('[Paynow callback] Invalid hash â€” possible forgery. Params:', params);
    return new Response('Invalid hash', { status: 400 });
  }

  const { reference, status, amount, paynowreference } = params;
  const normalizedStatus = (status ?? '').toLowerCase();

  console.log(`[Paynow callback] reference=${reference} status=${normalizedStatus}`);

  if (normalizedStatus === 'paid' || normalizedStatus === 'awaiting delivery') {
    await activateFromReference(reference, normalizedStatus, amount, paynowreference);
  } else if (['cancelled', 'disputed', 'refunded'].includes(normalizedStatus)) {
    await supabaseAdmin.from('payments').update({ status: normalizedStatus }).eq('reference', reference);
  }

  return new Response('OK', { status: 200 });
};

async function activateFromReference(reference, status, amount, paynowRef) {
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('user_id, plan, status')
    .eq('reference', reference)
    .single();

  if (!payment) { console.warn('[Paynow callback] Unknown reference:', reference); return; }
  if (payment.status === 'paid') return;

  await supabaseAdmin.from('payments').update({
    status:     'paid',
    paynow_ref: paynowRef,
    amount_usd: parseFloat(amount) || payment.amount_usd,
    paid_at:    new Date().toISOString(),
  }).eq('reference', reference);

  const isLifetime = payment.plan === 'lifetime';
  const update = { subscription_type: payment.plan };
  if (!isLifetime) {
    update.subscription_end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  } else {
    update.subscription_end_date = null;
  }

  await supabaseAdmin.from('profiles').update(update).eq('id', payment.user_id);

  console.log(`[Paynow callback] Activated ${payment.plan} for user ${payment.user_id}${isLifetime ? ' (lifetime)' : ''}`);
}

export const config = { path: '/api/paynow/callback' };
