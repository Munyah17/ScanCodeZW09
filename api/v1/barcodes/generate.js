/**
 * POST /api/v1/barcodes/generate
 *
 * Generates an EAN-13 or UPC-A barcode using the core ScanCodeZW engine.
 * The API is a doorway — barcode data is stored in the main platform's
 * `variations` table under the developer's account.
 *
 * Body:
 *   product_id?      — bigint; if omitted, a default "API" product is used
 *   country?         — ZW|ZA|US|... (default ZW)
 *   variation_type?  — e.g. "size", "colour" (default "API")
 *   variation_value? — e.g. "500ml", "Red"  (default "generated")
 *   include_qr?      — boolean, generate QR alongside (default false)
 *
 * Sandbox: returns a clearly marked test barcode, no DB write, no charge.
 * Live:    stores to variations table, deducts wallet.
 */

import QRCode            from 'qrcode';
import { requireDevKey } from '../../_utils/require-dev-key.js';
import { supabaseAdmin } from '../../_utils/supabase-admin.js';
import { deductWallet, logUsage } from '../../_utils/wallet-ops.js';
import { j }             from '../../_utils/response.js';

// ── EAN-13 engine (mirrors barcodeUtils.js — server-side port) ────────────────
const PREFIXES = {
  ZW: { fmt: 'EAN13', pfx: '977' },  ZA: { fmt: 'EAN13', pfx: '600' },
  NG: { fmt: 'EAN13', pfx: '615' },  KE: { fmt: 'EAN13', pfx: '616' },
  GH: { fmt: 'EAN13', pfx: '603' },  TZ: { fmt: 'EAN13', pfx: '619' },
  ZM: { fmt: 'EAN13', pfx: '621' },  UK: { fmt: 'EAN13', pfx: '500' },
  AU: { fmt: 'EAN13', pfx: '930' },  NZ: { fmt: 'EAN13', pfx: '940' },
  JP: { fmt: 'EAN13', pfx: '450' },  CN: { fmt: 'EAN13', pfx: '690' },
  IN: { fmt: 'EAN13', pfx: '890' },  MX: { fmt: 'EAN13', pfx: '750' },
  BR: { fmt: 'EAN13', pfx: '789' },  EU: { fmt: 'EAN13', pfx: '400' },
  US: { fmt: 'UPCA',  pfx: '0'   },  CA: { fmt: 'UPCA',  pfx: '0'   },
};

function ean13Check(d12) {
  let s = 0;
  for (let i = 0; i < 12; i++) s += parseInt(d12[i], 10) * (i % 2 === 0 ? 1 : 3);
  return (10 - s % 10) % 10;
}
function upcaCheck(d11) {
  let s = 0;
  for (let i = 0; i < 11; i++) s += parseInt(d11[i], 10) * (i % 2 === 0 ? 3 : 1);
  return (10 - s % 10) % 10;
}

function generateCode(country) {
  const spec   = PREFIXES[country] ?? PREFIXES.ZW;
  const pfx    = spec.pfx;
  const rndLen = spec.fmt === 'UPCA' ? 11 - pfx.length : 12 - pfx.length;
  const rnd    = String(Math.floor(Math.random() * Math.pow(10, rndLen))).padStart(rndLen, '0');
  if (spec.fmt === 'UPCA') {
    const b11  = (pfx + rnd).slice(0, 11);
    return { code: b11 + upcaCheck(b11), format: 'UPC-A' };
  }
  const b12 = (pfx + rnd).slice(0, 12);
  return { code: b12 + ean13Check(b12), format: 'EAN-13' };
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const t0 = Date.now();

  const { auth, error } = await requireDevKey(req, 'barcode_generate', 1);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }

  const {
    product_id,
    country         = 'ZW',
    variation_type  = 'API',
    variation_value = 'generated',
    include_qr      = false,
  } = body;

  const isSandbox = auth.environment === 'sandbox';

  // ── Sandbox response ────────────────────────────────────────────────────────
  if (isSandbox) {
    const qrDataUrl = include_qr ? await QRCode.toDataURL('TEST-BARCODE-0000000000000') : null;
    const duration  = Date.now() - t0;
    await logUsage({ userId: auth.userId, keyId: auth.keyId, environment: 'sandbox',
      endpoint: '/api/v1/barcodes/generate', operation: 'barcode_generate',
      statusCode: 200, costUsd: 0, durationMs: duration });
    return j({
      success:     true,
      environment: 'sandbox',
      barcode: {
        id:              'test_' + Math.random().toString(36).slice(2),
        code:            '0000000000000',
        format:          'EAN-13',
        country,
        variation_type,
        variation_value,
        qr_data_url:     qrDataUrl,
        note:            'SANDBOX — test barcode, not saved, not billed.',
      },
      billing: { cost: 0, balance: null, note: 'Sandbox — no charges.' },
    });
  }

  // ── Live: generate real barcode ─────────────────────────────────────────────
  const { code, format } = generateCode(country);

  // Resolve product_id: use provided or find/create "API Default" product
  let resolvedProductId = product_id;
  if (!resolvedProductId) {
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('user_id', auth.userId)
      .eq('product_name', 'API Default')
      .single();

    if (existing) {
      resolvedProductId = existing.id;
    } else {
      const { data: created } = await supabaseAdmin
        .from('products')
        .insert({ user_id: auth.userId, product_name: 'API Default', category: 'API' })
        .select('id')
        .single();
      resolvedProductId = created?.id;
    }
  }

  if (!resolvedProductId) {
    return j({ success: false, error: 'PRODUCT_ERROR', message: 'Could not resolve product.' }, 500);
  }

  // Deduct wallet BEFORE writing (fail fast if balance is low)
  const billing = await deductWallet(auth.userId, 'barcode_generate', 1, { country, format });
  if (!billing.success) {
    return j({ success: false, error: billing.error, message: 'Please top up your wallet.', balance: billing.balance }, 402);
  }

  // Save to variations (core platform is source of truth)
  const { data: variation, error: dbErr } = await supabaseAdmin
    .from('variations')
    .insert({
      product_id:      resolvedProductId,
      user_id:         auth.userId,
      variation_type,
      variation_value,
      barcode_data:    code,
      barcode_format:  format.replace('-', ''),   // EAN13 / UPCA
      barcode_country: country,
      qrcode_generated: include_qr,
    })
    .select('id')
    .single();

  if (dbErr) {
    console.error('[v1/barcodes/generate]', dbErr.message);
    return j({ success: false, error: 'DB_ERROR', message: dbErr.message }, 500);
  }

  const qrDataUrl = include_qr ? await QRCode.toDataURL(code, { errorCorrectionLevel: 'M' }) : null;

  const duration = Date.now() - t0;
  await logUsage({ userId: auth.userId, keyId: auth.keyId, environment: 'live',
    endpoint: '/api/v1/barcodes/generate', operation: 'barcode_generate',
    statusCode: 200, costUsd: billing.cost, durationMs: duration,
    requestMeta: { country, format, product_id: resolvedProductId } });

  return j({
    success:     true,
    environment: 'live',
    barcode: {
      id:              variation.id,
      code,
      format,
      country,
      variation_type,
      variation_value,
      product_id:      resolvedProductId,
      qr_data_url:     qrDataUrl,
    },
    billing: { cost: billing.cost, balance: billing.balance },
  });
};

export const config = { path: '/api/v1/barcodes/generate' };
