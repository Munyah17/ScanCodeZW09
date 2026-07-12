import { verifyCallback } from './paynow.js';

/**
 * Active confirmation fallback for Paynow payments — the second of the two
 * mechanisms Paynow's own integration docs describe (the other being the
 * passive result-URL webhook, which can be delayed or dropped on mobile
 * networks). POSTs to the poll URL issued at checkout initiation and
 * verifies the response with the same hash check used for the webhook.
 */
export async function pollPaynowStatus(pollUrl) {
  if (!pollUrl) return null;

  const res  = await fetch(pollUrl, { method: 'POST' });
  const text = await res.text();
  const params = Object.fromEntries(new URLSearchParams(text));
  if (!params.status) return null;

  if (!verifyCallback(params, process.env.PAYNOW_INTEGRATION_KEY)) {
    console.warn('[Paynow poll] Hash verification failed — ignoring response.');
    return null;
  }

  return {
    status:          params.status.toLowerCase(),
    amount:          params.amount,
    paynowReference: params.paynowreference,
  };
}
