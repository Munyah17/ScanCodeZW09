/**
 * POST /api/paynow/initiate
 *
 * Starts a Paynow web-redirect payment for a subscription plan.
 *
 * The client calls this, then immediately redirects the browser to the
 * returned `redirectUrl`. Paynow's hosted checkout handles method selection
 * (EcoCash, OneMoney, InnBucks, ZIPIT, Omari) and the full payment flow.
 *
 * Body:    { plan, userId, email, reference? }
 * Returns: { success, redirectUrl, reference }
 */

import { initiateWebPayment } from '../_utils/paynow.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';

const PLAN_AMOUNTS = {
  starter:  1.59,
  business: 4.99,
  pro:      11.99,
};

const PLAN_LABELS = {
  starter:  'ScanCodeZW Starter Plan – $1.59/month',
  business: 'ScanCodeZW Business Plan – $4.99/month',
  pro:      'ScanCodeZW Pro Plan – $11.99/month',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { plan, userId, email, reference: clientRef } = req.body ?? {};

  if (!plan || !PLAN_AMOUNTS[plan]) {
    return res.status(400).json({ error: `Invalid plan: "${plan}"` });
  }
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  const reference = clientRef ?? `SCZ-${userId}-${Date.now()}`;

  // Build return + result URLs. In production these are the live Vercel domain.
  const appUrl    = process.env.APP_URL ?? 'http://localhost:3000';
  const returnUrl = `${process.env.PAYNOW_RETURN_URL ?? `${appUrl}/payment/return`}?reference=${encodeURIComponent(reference)}`;
  const resultUrl = process.env.PAYNOW_RESULT_URL ?? `${appUrl}/api/paynow/callback`;

  try {
    const result = await initiateWebPayment({
      integrationId:  process.env.PAYNOW_INTEGRATION_ID,
      integrationKey: process.env.PAYNOW_INTEGRATION_KEY,
      reference,
      amount:         PLAN_AMOUNTS[plan],
      email:          email ?? '',
      description:    PLAN_LABELS[plan],
      returnUrl,
      resultUrl,
    });

    if (!result.success) {
      console.error('[Paynow] initiate failed:', result.error);
      return res.status(502).json({ error: result.error });
    }

    // Log pending payment in Supabase
    const { error: dbErr } = await supabaseAdmin.from('payments').insert({
      reference,
      user_id:         userId,
      plan,
      amount_usd:      PLAN_AMOUNTS[plan],
      method:          'paynow',
      paynow_poll_url: result.pollUrl ?? null,
      status:          'pending',
    });
    if (dbErr) console.warn('[Paynow] Supabase insert warning:', dbErr.message);

    return res.status(200).json({
      success:      true,
      redirectUrl:  result.redirectUrl,
      reference,
    });
  } catch (err) {
    console.error('[Paynow] initiate error:', err.message);
    return res.status(500).json({ error: 'Failed to initiate payment. Please try again.' });
  }
}
