/**
 * Wallet operations for the developer API billing system.
 * All balance changes are atomic (PostgreSQL row-locking via RPC).
 * Sandbox requests are never billed.
 */

import { supabaseAdmin } from './supabase-admin.js';

// ── Pricing ───────────────────────────────────────────────────────────────────
// Mirror of api_pricing table. Updated here when the table changes.
export const PRICING = {
  barcode_generate:      0.001,
  barcode_generate_bulk: 0.0008,   // per barcode when count > 10
  qr_generate:           0.001,
  qr_generate_bulk:      0.0008,   // per QR when count > 10
  barcode_list:          0,
  products_list:         0,
};

export function costFor(operation, count = 1) {
  const isBulk = count > 10;
  const bulkKey = operation + '_bulk';
  const unit = isBulk && PRICING[bulkKey] !== undefined
    ? PRICING[bulkKey]
    : (PRICING[operation] ?? 0);
  return parseFloat((unit * count).toFixed(6));
}

// ── Wallet ensure ─────────────────────────────────────────────────────────────
export async function ensureWallet(userId) {
  await supabaseAdmin
    .from('developer_wallets')
    .upsert({ user_id: userId }, { onConflict: 'user_id', ignoreDuplicates: true });
}

// ── Get balance ───────────────────────────────────────────────────────────────
export async function getWallet(userId) {
  const { data } = await supabaseAdmin
    .from('developer_wallets')
    .select('id, balance, currency, status, updated_at')
    .eq('user_id', userId)
    .single();
  return data ?? null;
}

// ── Atomic deduction (live only) ──────────────────────────────────────────────
// Returns { success, cost, balance } or { success: false, error }
export async function deductWallet(userId, operation, count = 1, extraMeta = {}) {
  const cost = costFor(operation, count);
  if (cost === 0) return { success: true, cost: 0 };

  const { data, error } = await supabaseAdmin.rpc('deduct_wallet_balance', {
    p_user_id:   userId,
    p_amount:    cost,
    p_operation: operation + (count > 1 ? ` ×${count}` : ''),
    p_metadata:  { operation, count, ...extraMeta },
  });

  if (error) {
    console.error('[wallet-ops] deduct RPC error:', error.message);
    return { success: false, error: 'WALLET_ERROR' };
  }

  if (!data.success) return { success: false, error: data.error, balance: data.balance ?? null };

  return { success: true, cost, balance: data.balance };
}

// ── Log usage ─────────────────────────────────────────────────────────────────
export async function logUsage({ userId, keyId, environment, endpoint, operation, statusCode, costUsd, durationMs, requestMeta, responseMeta }) {
  await supabaseAdmin.from('api_usage_logs').insert({
    user_id:       userId,
    api_key_id:    keyId,
    environment,
    endpoint,
    operation,
    status_code:   statusCode,
    cost_usd:      costUsd ?? 0,
    duration_ms:   durationMs,
    request_meta:  requestMeta ?? null,
    response_meta: responseMeta ?? null,
  }).catch(err => console.warn('[wallet-ops] log insert warning:', err.message));
}
