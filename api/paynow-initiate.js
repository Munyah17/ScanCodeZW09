import { Paynow } from 'paynow';
import { requireAuth }   from './_utils/require-auth.js';
import { j }             from './_utils/response.js';
import { supabaseAdmin } from './_utils/supabase-admin.js';

const PLAN_AMOUNTS = { starter: 4.79, business: 11.99, pro: 24.99, lifetime: 129.99 };
const PLAN_LABELS  = {
  starter:  'ScanCodeZW Starter Plan',
  business: 'ScanCodeZW Business Plan',
  pro:      'ScanCodeZW Pro Plan',
  lifetime: 'ScanCodeZW Lifetime Plan',
};

export default async (req) => {
  try {
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
    const appUrl    = process.env.APP_URL ?? 'https://scancodezw.netlify.app';
    const resultUrl = process.env.PAYNOW_RESULT_URL ?? `${appUrl}/api/paynow/callback`;
    const returnUrl = `${process.env.PAYNOW_RETURN_URL ?? `${appUrl}/payment/return`}?reference=${encodeURIComponent(reference)}&plan=${encodeURIComponent(plan)}`;

    // Insert pending record first — before calling Paynow
    await supabaseAdmin.from('payments').insert({
      reference,
      user_id:    userId,
      plan,
      amount_usd: PLAN_AMOUNTS[plan],
      method:     'paynow',
      status:     'pending',
    });

    const paynow = new Paynow(integrationId, integrationKey);
    paynow.resultUrl = resultUrl;
    paynow.returnUrl = returnUrl;

    const payment = paynow.createPayment(reference, email);
    payment.add(PLAN_LABELS[plan], PLAN_AMOUNTS[plan]);

    const result = await paynow.send(payment);

    if (!result.success) {
      console.error('[Paynow] initiate failed:', result.error);
      return j({ error: result.error || 'Paynow payment initiation failed.' }, 502);
    }

    // Update poll URL in background — redirect URL is all the client needs
    supabaseAdmin.from('payments')
      .update({ paynow_poll_url: result.pollUrl ?? null })
      .eq('reference', reference)
      .then(({ error }) => { if (error) console.warn('[Paynow] poll URL update:', error.message); });

    return j({ success: true, redirectUrl: result.redirectUrl, reference });

  } catch (err) {
    console.error('[Paynow] unhandled error:', err.message, err.stack);
    return j({ error: err.message || 'Paynow initiation failed.' }, 500);
  }
};

export const config = { path: '/api/paynow/initiate' };
