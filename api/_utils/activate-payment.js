import { supabaseAdmin } from './supabase-admin.js';
import { notify }        from './notify.js';

/**
 * Shared by the Paynow result-URL webhook AND the active poll-URL fallback
 * (payments-status.js) — both confirmation paths activate a plan the same way.
 */
export async function activatePaynowPayment(reference, amount, paynowRef) {
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('user_id, plan, status, amount_usd')
    .eq('reference', reference)
    .single();

  if (!payment) { console.warn('[Paynow] Unknown reference:', reference); return; }
  if (payment.status === 'paid') return;

  await supabaseAdmin.from('payments').update({
    status:     'paid',
    paynow_ref: paynowRef,
    amount_usd: parseFloat(amount) || payment.amount_usd,
    paid_at:    new Date().toISOString(),
  }).eq('reference', reference);

  const isLifetime = payment.plan === 'lifetime';
  const update = { subscription_type: payment.plan };
  update.subscription_end_date = isLifetime
    ? null
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  await supabaseAdmin.from('profiles').update(update).eq('id', payment.user_id);

  console.log(`[Paynow] Activated ${payment.plan} for user ${payment.user_id}${isLifetime ? ' (lifetime)' : ''}`);
  await notify(payment.user_id, 'Payment received', `Your ${payment.plan} plan is now active. Thank you!`, 'success');
}
