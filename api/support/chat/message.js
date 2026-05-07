/**
 * POST /api/support/chat/message
 * Adds a message to an active (or waiting) chat session.
 * Body: { sessionId, senderName, body, isAgent?, senderId? }
 */

import { supabaseAdmin } from '../../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { sessionId, senderName, body, isAgent = false, senderId } = req.body ?? {};
  if (!sessionId || !body || !senderName) {
    return res.status(400).json({ error: 'sessionId, senderName, and body are required.' });
  }

  try {
    const { data: session } = await supabaseAdmin
      .from('chat_sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    if (!session) return res.status(404).json({ error: 'Session not found.' });
    if (session.status === 'ended' || session.status === 'timed_out') {
      return res.status(400).json({ error: 'Cannot send messages to a closed session.' });
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        session_id:  sessionId,
        sender_id:   senderId ?? null,
        sender_name: senderName,
        is_agent:    isAgent,
        body,
      })
      .select('id, created_at')
      .single();

    if (error) throw error;
    return res.status(200).json({ messageId: data.id, created_at: data.created_at });
  } catch (err) {
    console.error('[chat/message]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
