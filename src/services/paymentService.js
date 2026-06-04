const API_BASE = '';

export const PLAN_PRICES = {
  free:     { label: 'Free Trial', usd: 0 },
  starter:  { label: 'Starter',    usd: 4.79  },
  business: { label: 'Business',   usd: 11.99  },
  pro:      { label: 'Pro',        usd: 24.99 },
  lifetime: { label: 'Lifetime',   usd: 129.99, oneTime: true },
};

async function parseResponse(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { error: text || `HTTP ${res.status}` }; }
}

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createStripeCheckoutSession({ plan, reference, token }) {
  const res = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body:    JSON.stringify({ plan, reference }),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'Failed to create checkout session.');
  if (!data.url) throw new Error('Payment gateway returned an invalid response.');
  return data; // { url }
}

export async function initiatePaynowRedirect({ plan, reference, token }) {
  const res = await fetch(`${API_BASE}/api/paynow/initiate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader(token) },
    body:    JSON.stringify({ plan, reference }),
  });
  const data = await parseResponse(res);
  if (!res.ok) throw new Error(data.error || 'Failed to initiate Paynow payment.');
  if (!data.redirectUrl) throw new Error('Payment gateway returned an invalid response.');
  return data; // { success, redirectUrl, reference }
}

export function generateReference(userId) {
  return `SCZ-${userId}-${Date.now()}`;
}
