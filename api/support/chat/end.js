/**
 * POST /api/support/chat/end
 * Marks a chat session as ended. Can be called by the user or an admin.
 * Body: { sessionId, reason? }  reason: 'user' | 'agent' | 'timed_out'
 */

import { supabaseAdmin } from '../../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, reason = 'user' } = req.body ?? {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required.' });

  const status = reason === 'timed_out' ? 'timed_out' : 'ended';

  const { error } = await supabaseAdmin
    .from('chat_sessions')
    .update({ status, ended_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ success: true });
}
