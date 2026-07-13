const API_BASE = '';

export const PLAN_PRICES = {
  starter:    { label: 'Starter',                usd: 5.90   },
  business:   { label: 'Business',               usd: 16.90  },
  pro:        { label: 'Pro',                    usd: 29.90  },
  lifetime:   { label: 'Lifetime Access',        usd: 129.99, oneTime: true },
  otg_single: { label: '1 Barcode Generation',   usd: 10.00,  oneTime: true },
  otg_triple: { label: '3 Barcode Generations',  usd: 20.00,  oneTime: true },
  otg_ten:    { label: '10 Barcode Generations', usd: 50.00,  oneTime: true },
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
