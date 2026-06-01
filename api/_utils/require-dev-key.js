/**
 * Middleware for developer API key authentication.
 *
 * Flow: validate key → check environment → (live only) check wallet balance
 * Sandbox keys are always allowed with no balance check and no charges.
 */

import crypto            from 'crypto';
import { supabaseAdmin } from './supabase-admin.js';
import { j }             from './response.js';
import { PRICING, costFor } from './wallet-ops.js';

export async function requireDevKey(req, operation = null, count = 1) {
  const rawKey = (req.headers.get('x-api-key') ?? '').trim();

  if (!rawKey) {
    return { auth: null, error: j({ success: false, error: 'MISSING_KEY', message: 'Provide your API key in the X-API-Key header.' }, 401) };
  }

  if (!rawKey.startsWith('scz_live_') && !rawKey.startsWith('scz_test_')) {
    return { auth: null, error: j({ success: false, error: 'INVALID_KEY_FORMAT', message: 'Invalid API key format.' }, 401) };
  }

  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const { data: key, error: dbErr } = await supabaseAdmin
    .from('dev_api_keys')
    .select('id, user_id, environment, scopes, active, rate_limit')
    .eq('key_hash', keyHash)
    .single();

  if (dbErr || !key) {
    return { auth: null, error: j({ success: false, error: 'INVALID_KEY', message: 'API key not found.' }, 401) };
  }
  if (!key.active) {
    return { auth: null, error: j({ success: false, error: 'KEY_REVOKED', message: 'This API key has been revoked.' }, 401) };
  }

  // Scope check
  if (operation) {
    const scopeMap = {
      barcode_generate:      'barcode:generate',
      barcode_generate_bulk: 'barcode:generate',
      barcode_list:          'barcode:list',
      qr_generate:           'qr:generate',
      qr_generate_bulk:      'qr:generate',
      products_list:         'products:read',
    };
    const required = scopeMap[operation];
    if (required && !key.scopes.includes(required)) {
      return { auth: null, error: j({ success: false, error: 'INSUFFICIENT_SCOPE', message: `This key does not have the '${required}' scope.` }, 403) };
    }
  }

  // Fire-and-forget last_used update
  supabaseAdmin.from('dev_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', key.id).then(() => {});

  const isSandbox = key.environment === 'sandbox';

  // Sandbox — no wallet check, no charges
  if (isSandbox) {
    return {
      auth: {
        userId:      key.user_id,
        keyId:       key.id,
        environment: 'sandbox',
        scopes:      key.scopes,
      },
      error: null,
    };
  }

  // Live — check wallet for billable operations
  if (operation && costFor(operation, count) > 0) {
    const required = costFor(operation, count);

    const { data: wallet } = await supabaseAdmin
      .from('developer_wallets')
      .select('balance, status')
      .eq('user_id', key.user_id)
      .single();

    if (!wallet || wallet.status !== 'active') {
      return {
        auth: null,
        error: j({
          success: false,
          error:   'WALLET_NOT_FOUND',
          message: 'Developer wallet not found. Visit your developer portal to set up billing.',
        }, 402),
      };
    }

    if (wallet.balance < required) {
      return {
        auth: null,
        error: j({
          success:   false,
          error:     'INSUFFICIENT_BALANCE',
          message:   'Please top up your wallet.',
          balance:   wallet.balance,
          required,
          top_up_url: 'https://developers.scancodezw.co.zw/wallet',
        }, 402),
      };
    }
  }

  return {
    auth: {
      userId:      key.user_id,
      keyId:       key.id,
      environment: 'live',
      scopes:      key.scopes,
    },
    error: null,
  };
}
