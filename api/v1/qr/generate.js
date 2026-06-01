/**
 * POST /api/v1/qr/generate
 *
 * Generates a QR code for any content.
 * Returns a base64 PNG data URL.
 *
 * Body:
 *   data             — string to encode (URL, text, product code, etc.)
 *   error_correction? — L | M | Q | H (default M)
 *   size?            — pixel size of output image (default 256, max 1024)
 *
 * Sandbox: returns a test QR code, no charge.
 * Live:    returns real QR code, deducts $0.001 from wallet.
 */

import QRCode            from 'qrcode';
import { requireDevKey } from '../../_utils/require-dev-key.js';
import { deductWallet, logUsage } from '../../_utils/wallet-ops.js';
import { j }             from '../../_utils/response.js';

const EC_LEVELS = new Set(['L', 'M', 'Q', 'H']);

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const t0 = Date.now();

  const { auth, error } = await requireDevKey(req, 'qr_generate', 1);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const { data, error_correction = 'M', size = 256 } = body;

  if (!data || typeof data !== 'string' || data.trim().length === 0) {
    return j({ error: "data is required and must be a non-empty string." }, 400);
  }
  if (data.length > 2953) {
    return j({ error: "data exceeds QR code capacity (max ~2953 chars for binary)." }, 400);
  }
  const ec = (error_correction ?? 'M').toUpperCase();
  if (!EC_LEVELS.has(ec)) {
    return j({ error: "error_correction must be L, M, Q, or H." }, 400);
  }
  const px = Math.min(Math.max(parseInt(size, 10) || 256, 64), 1024);

  const isSandbox = auth.environment === 'sandbox';

  const qrDataUrl = await QRCode.toDataURL(isSandbox ? 'SANDBOX TEST QR CODE' : data.trim(), {
    errorCorrectionLevel: ec,
    width: px,
    margin: 2,
  });

  const duration = Date.now() - t0;

  if (isSandbox) {
    await logUsage({ userId: auth.userId, keyId: auth.keyId, environment: 'sandbox',
      endpoint: '/api/v1/qr/generate', operation: 'qr_generate',
      statusCode: 200, costUsd: 0, durationMs: duration });
    return j({
      success:     true,
      environment: 'sandbox',
      qr: {
        data_url:        qrDataUrl,
        error_correction: ec,
        size:            px,
        note:            'SANDBOX — test QR code, not billed.',
      },
      billing: { cost: 0, balance: null, note: 'Sandbox — no charges.' },
    });
  }

  // Live: deduct wallet
  const billing = await deductWallet(auth.userId, 'qr_generate', 1, { ec, size: px });
  if (!billing.success) {
    return j({ success: false, error: billing.error, message: 'Please top up your wallet.', balance: billing.balance }, 402);
  }

  await logUsage({ userId: auth.userId, keyId: auth.keyId, environment: 'live',
    endpoint: '/api/v1/qr/generate', operation: 'qr_generate',
    statusCode: 200, costUsd: billing.cost, durationMs: duration,
    requestMeta: { ec, size: px, data_length: data.length } });

  return j({
    success:     true,
    environment: 'live',
    qr: {
      data_url:         qrDataUrl,
      encoded_data:     data.trim(),
      error_correction: ec,
      size:             px,
    },
    billing: { cost: billing.cost, balance: billing.balance },
  });
};

export const config = { path: '/api/v1/qr/generate' };
