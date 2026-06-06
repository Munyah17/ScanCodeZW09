/**
 * Paynow Zimbabwe — Web redirect integration.
 *
 * Docs: https://developers.paynow.co.zw/docs/
 *
 * Flow: POST /interface/initiatetransaction → get browserurl → redirect customer there.
 * Paynow's hosted checkout handles EcoCash, OneMoney, InnBucks, ZIPIT, Omari.
 */

import crypto from 'crypto';

const PAYNOW_INITIATE_URL = 'https://www.paynow.co.zw/interface/initiatetransaction';

function buildHash(fields, integrationKey) {
  // Paynow spec: SHA512(concatenated_field_values + integrationKey)
  const message = Object.values(fields).join('') + integrationKey;
  return crypto
    .createHash('sha512')
    .update(message)
    .digest('hex')
    .toUpperCase();
}

/**
 * Initiate a web-redirect payment.
 * Returns { success, redirectUrl, pollUrl } on success or { success: false, error } on failure.
 * Redirect the customer to `redirectUrl` — Paynow handles everything from there.
 */
export async function initiateWebPayment(opts) {
  const {
    integrationId,
    integrationKey,
    reference,
    amount,
    email       = '',
    description = 'ScanCodeZW Subscription',
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

  const resp = await fetch(PAYNOW_INITIATE_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams(fields).toString(),
  });

  const text = await resp.text();
  const data = parseQueryString(text);

  if ((data.status ?? '').toLowerCase() === 'error') {
    return { success: false, error: data.error || 'Paynow returned an error.' };
  }

  if ((data.status ?? '').toLowerCase() === 'ok') {
    return { success: true, redirectUrl: data.browserurl, pollUrl: data.pollurl };
  }

  return {
    success: false,
    error:   `Unexpected Paynow status: "${data.status}". Raw: ${text.slice(0, 200)}`,
  };
}

/**
 * Verify a Paynow result-URL callback POST.
 * Always verify the hash before trusting the status field.
 */
export function verifyCallback(params, integrationKey) {
  const { hash, ...rest } = params;
  if (!hash) return false;
  return buildHash(rest, integrationKey) === hash.toUpperCase();
}

function parseQueryString(str) {
  const out = {};
  for (const pair of str.split('&')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    out[decodeURIComponent(pair.slice(0, eqIdx))] =
      decodeURIComponent(pair.slice(eqIdx + 1).replace(/\+/g, ' '));
  }
  return out;
}
