/**
 * POST /api/v1/barcodes/bulk
 *
 * Generates multiple barcodes in a single request.
 * Bulk rate ($0.0008 each) applies when count > 10.
 *
 * Body:
 *   items[]          — array of { country?, variation_type?, variation_value?, product_id? }
 *   include_qr?      — boolean, generate QR for each (default false)
 *
 * Max 100 barcodes per request.
 */

import QRCode            from 'qrcode';
import { requireDevKey } from '../../_utils/require-dev-key.js';
import { supabaseAdmin } from '../../_utils/supabase-admin.js';
import { deductWallet, logUsage, costFor } from '../../_utils/wallet-ops.js';
import { j }             from '../../_utils/response.js';

const MAX_BULK = 100;

// Same engine as generate.js
const PREFIXES = {
  ZW: { fmt: 'EAN13', pfx: '977' }, ZA: { fmt: 'EAN13', pfx: '600' },
  NG: { fmt: 'EAN13', pfx: '615' }, KE: { fmt: 'EAN13', pfx: '616' },
  GH: { fmt: 'EAN13', pfx: '603' }, TZ: { fmt: 'EAN13', pfx: '619' },
  ZM: { fmt: 'EAN13', pfx: '621' }, UK: { fmt: 'EAN13', pfx: '500' },
  AU: { fmt: 'EAN13', pfx: '930' }, NZ: { fmt: 'EAN13', pfx: '940' },
  JP: { fmt: 'EAN13', pfx: '450' }, CN: { fmt: 'EAN13', pfx: '690' },
  IN: { fmt: 'EAN13', pfx: '890' }, MX: { fmt: 'EAN13', pfx: '750' },
  BR: { fmt: 'EAN13', pfx: '789' }, EU: { fmt: 'EAN13', pfx: '400' },
  US: { fmt: 'UPCA',  pfx: '0'   }, CA: { fmt: 'UPCA',  pfx: '0'   },
};
function ean13Check(d12) { let s=0; for(let i=0;i<12;i++) s+=parseInt(d12[i],10)*(i%2===0?1:3); return(10-s%10)%10; }
function upcaCheck(d11)  { let s=0; for(let i=0;i<11;i++) s+=parseInt(d11[i],10)*(i%2===0?3:1); return(10-s%10)%10; }
function generateCode(country) {
  const spec=PREFIXES[country]??PREFIXES.ZW; const pfx=spec.pfx;
  const rndLen=spec.fmt==='UPCA'?11-pfx.length:12-pfx.length;
  const rnd=String(Math.floor(Math.random()*Math.pow(10,rndLen))).padStart(rndLen,'0');
  if(spec.fmt==='UPCA'){const b11=(pfx+rnd).slice(0,11);return{code:b11+upcaCheck(b11),format:'UPC-A'};}
  const b12=(pfx+rnd).slice(0,12);return{code:b12+ean13Check(b12),format:'EAN-13'};
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const t0 = Date.now();

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { items = [], include_qr = false } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return j({ error: 'items array is required.' }, 400);
  }
  if (items.length > MAX_BULK) {
    return j({ error: `Maximum ${MAX_BULK} items per bulk request.` }, 400);
  }

  const op    = items.length > 10 ? 'barcode_generate_bulk' : 'barcode_generate';
  const { auth, error } = await requireDevKey(req, op, items.length);
  if (error) return error;

  const isSandbox = auth.environment === 'sandbox';

  if (isSandbox) {
    const results = items.map((item, i) => ({
      index:           i,
      code:            '000000000000' + i,
      format:          'EAN-13',
      country:         item.country ?? 'ZW',
      variation_type:  item.variation_type ?? 'API',
      variation_value: item.variation_value ?? `item-${i}`,
      note:            'SANDBOX',
    }));
    await logUsage({ userId: auth.userId, keyId: auth.keyId, environment: 'sandbox',
      endpoint: '/api/v1/barcodes/bulk', operation: op,
      statusCode: 200, costUsd: 0, durationMs: Date.now() - t0 });
    return j({ success: true, environment: 'sandbox', count: results.length, results,
      billing: { cost: 0, balance: null, note: 'Sandbox — no charges.' } });
  }

  // Live: deduct first, then generate
  const billing = await deductWallet(auth.userId, op, items.length);
  if (!billing.success) {
    return j({ success: false, error: billing.error, message: 'Please top up your wallet.', balance: billing.balance }, 402);
  }

  // Resolve or create API Default product for items without product_id
  let defaultProductId = null;
  const needsDefault = items.some(i => !i.product_id);
  if (needsDefault) {
    const { data: existing } = await supabaseAdmin
      .from('products').select('id').eq('user_id', auth.userId).eq('product_name', 'API Default').single();
    if (existing) {
      defaultProductId = existing.id;
    } else {
      const { data: created } = await supabaseAdmin
        .from('products').insert({ user_id: auth.userId, product_name: 'API Default', category: 'API' }).select('id').single();
      defaultProductId = created?.id;
    }
  }

  const rows    = [];
  const results = [];

  for (let i = 0; i < items.length; i++) {
    const item    = items[i];
    const { code, format } = generateCode(item.country ?? 'ZW');
    const pid     = item.product_id ?? defaultProductId;
    rows.push({
      product_id:      pid,
      user_id:         auth.userId,
      variation_type:  item.variation_type  ?? 'API',
      variation_value: item.variation_value ?? `item-${i}`,
      barcode_data:    code,
      barcode_format:  format.replace('-', ''),
      barcode_country: item.country ?? 'ZW',
      qrcode_generated: include_qr,
    });
    results.push({ index: i, code, format, country: item.country ?? 'ZW',
      variation_type: item.variation_type ?? 'API', variation_value: item.variation_value ?? `item-${i}` });
  }

  const { data: inserted, error: dbErr } = await supabaseAdmin
    .from('variations').insert(rows).select('id');

  if (dbErr) {
    console.error('[v1/barcodes/bulk]', dbErr.message);
    return j({ success: false, error: 'DB_ERROR', message: dbErr.message }, 500);
  }

  inserted?.forEach((row, i) => { results[i].id = row.id; });

  if (include_qr) {
    await Promise.all(results.map(async r => {
      r.qr_data_url = await QRCode.toDataURL(r.code, { errorCorrectionLevel: 'M' });
    }));
  }

  await logUsage({ userId: auth.userId, keyId: auth.keyId, environment: 'live',
    endpoint: '/api/v1/barcodes/bulk', operation: op,
    statusCode: 200, costUsd: billing.cost, durationMs: Date.now() - t0,
    requestMeta: { count: items.length } });

  return j({ success: true, environment: 'live', count: results.length, results,
    billing: { cost: billing.cost, balance: billing.balance } });
};

export const config = { path: '/api/v1/barcodes/bulk' };
