/**
 * POST /api/keys/generate
 *
 * Generates a new API key for the authenticated user.
 * Returns the full key ONCE — it is never retrievable again.
 * Stores only the SHA-256 hash and a 8-char prefix in the database.
 *
 * Body: { name, scopes: string[], expiresAt?: ISO string }
 */

import crypto              from 'crypto';
import { requireAuth }     from '../_utils/require-auth.js';
import { supabaseAdmin }   from '../_utils/supabase-admin.js';

const ALLOWED_SCOPES = new Set([
  'read:barcodes',
  'read:products',
  'write:products',
  'write:barcodes',
  'read:subscription',
]);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { name, scopes = [], expiresAt } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'Key name is required.' });

  const invalidScopes = scopes.filter(s => !ALLOWED_SCOPES.has(s));
  if (invalidScopes.length) {
    return res.status(400).json({ error: `Invalid scopes: ${invalidScopes.join(', ')}` });
  }

  // Generate a cryptographically random key: scz_live_<32 random hex bytes>
  const rawKey   = `scz_live_${crypto.randomBytes(32).toString('hex')}`;
  const keyHash  = crypto.createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 12);   // "scz_live_" + 3 chars

  try {
    const { error } = await supabaseAdmin.from('api_keys').insert({
      user_id:    auth.userId,
      name,
      key_prefix: keyPrefix,
      key_hash:   keyHash,
      scopes,
      expires_at: expiresAt ?? null,
    });

    if (error) throw error;

    return res.status(200).json({
      key:    rawKey,    // shown once — client must copy and store safely
      prefix: keyPrefix,
      name,
      scopes,
    });
  } catch (err) {
    console.error('[keys/generate]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
