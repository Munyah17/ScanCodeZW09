/**
 * POST /api/keys/revoke
 * Deactivates an API key. Only the key's owner or an admin may revoke it.
 * Body: { keyId }
 */

import { requireAuth }   from '../_utils/require-auth.js';
import { supabaseAdmin } from '../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = await requireAuth(req, res);
  if (!auth) return;

  const { keyId } = req.body ?? {};
  if (!keyId) return res.status(400).json({ error: 'keyId is required.' });

  const { data: key } = await supabaseAdmin
    .from('api_keys')
    .select('user_id')
    .eq('id', keyId)
    .single();

  if (!key) return res.status(404).json({ error: 'Key not found.' });

  const isOwner = key.user_id === auth.userId;
  const isAdmin = auth.profile?.user_type === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'You do not have permission to revoke this key.' });
  }

  const { error } = await supabaseAdmin
    .from('api_keys')
    .update({ active: false })
    .eq('id', keyId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
