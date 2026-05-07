/**
 * Payment service — client-side layer.
 *
 * All functions call Vercel serverless functions in /api/.
 * On localhost use `vercel dev` (port 3000) so the /api/ routes are available.
 *
 * In production (Vercel), calls go to /api/* on the same domain automatically.
 */

const API_BASE = import.meta.env.DEV
  ? 'http://localhost:3000'   // vercel dev
  : '';                       // same-origin on Vercel

export const PLAN_PRICES = {
  starter:  { label: 'Starter',  usd: 1.59  },
  business: { label: 'Business', usd: 4.99  },
  pro:      { label: 'Pro',      usd: 11.99 },
};

// ── Stripe ────────────────────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout Session and return the hosted URL to redirect to.
 * @returns {{ url: string }}
 */
export async function createStripeCheckoutSession({ plan, userId, email, reference }) {
  const res = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ plan, userId, email, reference }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create checkout session.');
  return data;  // { url }
}

// ── Paynow ────────────────────────────────────────────────────────────────────

/**
 * Initiate a Paynow web-redirect payment.
 * Redirects the user's browser to Paynow's hosted checkout page.
 * @returns {{ success: boolean, redirectUrl: string, reference: string }}
 */
export async function initiatePaynowRedirect({ plan, userId, email, reference }) {
  const res = await fetch(`${API_BASE}/api/paynow/initiate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ plan, userId, email, reference }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to initiate payment.');
  return data;  // { success, redirectUrl, reference }
}

// ── Shared ────────────────────────────────────────────────────────────────────

export function generateReference(userId) {
  return `SCZ-${userId}-${Date.now()}`;
}
