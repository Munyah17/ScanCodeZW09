/**
 * GET /api/payments/status?reference=REF
 *
 * No auth required — the reference itself is the unforgeable token issued
 * by the backend at checkout initiation. Returns only non-sensitive status
 * fields so the PaymentReturn page can show the right UI.
 *
 * For a still-pending Paynow payment, this actively polls Paynow's poll URL
 * (the integration-ID/key confirmation mechanism) rather than only waiting
 * on the passive result-URL webhook, which can be delayed or dropped.
 */

import { supabaseAdmin }         from '../_utils/supabase-admin.js';
import { j }                     from '../_utils/response.js';
import { pollPaynowStatus }      from '../_utils/paynow-poll.js';
import { activatePaynowPayment } from '../_utils/activate-payment.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const url       = new URL(req.url);
  const reference = url.searchParams.get('reference');
  if (!reference) return j({ error: 'Missing reference parameter.' }, 400);

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('status, plan, method, paynow_poll_url')
    .eq('reference', reference)
    .single();

  if (error && error.code === 'PGRST116') {
    // Record not yet created (webhook hasn't fired yet for Stripe)
    return j({ status: 'not_found' }, 404);
  }
  if (error) {
    console.error('[payments/status] DB error:', error.message);
    return j({ error: 'Internal server error.' }, 500);
  }

  if (data.status === 'pending' && data.method === 'paynow' && data.paynow_poll_url) {
    try {
      const polled = await pollPaynowStatus(data.paynow_poll_url);
      if (polled?.status === 'paid' || polled?.status === 'awaiting delivery') {
        await activatePaynowPayment(reference, polled.amount, polled.paynowReference);
        return j({ status: 'paid', plan: data.plan, method: data.method });
      }
      if (polled && ['cancelled', 'disputed', 'refunded'].includes(polled.status)) {
        await supabaseAdmin.from('payments').update({ status: polled.status }).eq('reference', reference);
        return j({ status: polled.status, plan: data.plan, method: data.method });
      }
    } catch (err) {
      console.warn('[payments/status] Paynow poll failed, falling back to DB status:', err.message);
    }
  }

  return j({ status: data.status, plan: data.plan, method: data.method });
};

export const config = { path: '/api/payments/status' };
