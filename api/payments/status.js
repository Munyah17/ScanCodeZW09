/**
 * GET /api/payments/status?reference=REF
 *
 * No auth required — the reference itself is the unforgeable token issued
 * by the backend at checkout initiation. Returns only non-sensitive status
 * fields so the PaymentReturn page can show the right UI.
 */

import { supabaseAdmin } from '../_utils/supabase-admin.js';
import { j }             from '../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const url       = new URL(req.url);
  const reference = url.searchParams.get('reference');
  if (!reference) return j({ error: 'Missing reference parameter.' }, 400);

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('status, plan, method')
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

  return j({ status: data.status, plan: data.plan, method: data.method });
};

export const config = { path: '/api/payments/status' };
