/**
 * Paynow Zimbabwe — Web redirect integration.
 *
 * Docs: https://developers.paynow.co.zw/docs/
 *
 * This module uses the STANDARD WEB REDIRECT flow:
 *   POST /interface/initiatetransaction → get browserurl → redirect user there.
 *
 * Paynow's hosted checkout page handles EcoCash, OneMoney, InnBucks, ZIPIT,
 * and Omari selection. We do NOT use the USSD-push remote transaction endpoint.
 */

import crypto from 'crypto';

const PAYNOW_INITIATE_URL = 'https://www.paynow.co.zw/interface/initiatetransaction';

/**
 * Build the HMAC-SHA512 hash Paynow requires on every request.
 * Hash = UPPERCASE hex of HMAC-SHA512 over concatenated field VALUES,
 * keyed with the integration key.
 */
function buildHash(fields, integrationKey) {
  const message = Object.values(fields).join('');
  return crypto
    .createHmac('sha512', integrationKey)
    .update(message)
    .digest('hex')
    .toUpperCase();
}

/**
 * Initiate a standard web-redirect payment.
 *
 * After calling this, redirect the user's browser to the returned `redirectUrl`.
 * Paynow handles the entire checkout UX (method selection, OTP, confirmation).
 * When done, Paynow redirects the user to `returnUrl` and POSTs to `resultUrl`.
 *
 * Hash fields (in order): id, reference, amount, additionalinfo,
 *                          returnurl, resulturl, status, authemail
 * (phone and method are NOT in the web-redirect hash — they belong to the
 *  remote/USSD flow only)
 *
 * @param {object} opts
 * @param {string} opts.integrationId
 * @param {string} opts.integrationKey
 * @param {string} opts.reference       – Your unique order reference
 * @param {number} opts.amount          – Amount in USD (e.g. 4.99)
 * @param {string} opts.email           – Customer email (shown on receipt)
 * @param {string} opts.description     – Short description shown to customer
 * @param {string} opts.resultUrl       – Paynow POSTs status update here (webhook)
 * @param {string} opts.returnUrl       – Browser redirect here after payment
 *
 * @returns {{ success, redirectUrl, pollUrl, error }}
 */
export async function initiateWebPayment(opts) {
  const {
    integrationId,
    integrationKey,
    reference,
    amount,
    email        = '',
    description  = 'ScanCodeZW Subscription',
    resultUrl,
    returnUrl,
  } = opts;

  const fields = {
    id:             integrationId,
    reference,
    amount:         Number(amount).toFixed(2),
    additionalinfo: description,
    returnurl:      returnUrl,
    resulturl:      resultUrl,
    status:         'Message',
    authemail:      email,
  };

  fields.hash = buildHash(fields, integrationKey);

  const body = new URLSearchParams(fields).toString();

  const resp = await fetch(PAYNOW_INITIATE_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const text = await resp.text();
  return parseInitiateResponse(text);
}

/**
 * Verify a Paynow result-URL callback POST.
 * Returns true only when the hash matches — never trust status without this.
 *
 * @param {object} params   – The parsed POST body from Paynow
 * @param {string} integrationKey
 * @returns {boolean}
 */
export function verifyCallback(params, integrationKey) {
  const { hash, ...rest } = params;
  if (!hash) return false;
  const expected = buildHash(rest, integrationKey);
  return expected === hash.toUpperCase();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseInitiateResponse(text) {
  const data = parseQueryString(text);

  if ((data.status ?? '').toLowerCase() === 'error') {
    return { success: false, error: data.error || 'Paynow returned an error.' };
  }

  if ((data.status ?? '').toLowerCase() === 'ok') {
    return {
      success:     true,
      redirectUrl: data.browserurl,
      pollUrl:     data.pollurl,
    };
  }

  return {
    success: false,
    error:   `Unexpected Paynow status: "${data.status}". Raw: ${text.slice(0, 200)}`,
  };
}

function parseQueryString(str) {
  const out = {};
  for (const pair of str.split('&')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const k = decodeURIComponent(pair.slice(0, eqIdx));
    const v = decodeURIComponent(pair.slice(eqIdx + 1).replace(/\+/g, ' '));
    out[k] = v;
  }
  return out;
}
