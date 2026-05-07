/**
 * POST /api/support/chat/claim
 * Agent claims a waiting chat session. Requires admin JWT.
 * Body: { sessionId }
 */

import { requireAdmin }  from '../../_utils/require-admin.js';
import { supabaseAdmin } from '../../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireAdmin(req, res);
  if (!admin) return;

  const { sessionId } = req.body ?? {};
  if (!sessionId) return res.status(400).json({ error: 'sessionId is required.' });

  const { data: session } = await supabaseAdmin
    .from('chat_sessions')
    .select('status')
    .eq('id', sessionId)
    .single();

  if (!session) return res.status(404).json({ error: 'Session not found.' });
  if (session.status !== 'waiting') {
    return res.status(400).json({ error: `Session is already ${session.status}.` });
  }

  const { error } = await supabaseAdmin
    .from('chat_sessions')
    .update({
      status:      'active',
      agent_id:    admin.id,
      assigned_at: new Date().toISOString(),
    })
    .eq('id', sessionId);

  if (error) return res.status(500).json({ error: error.message });

  // Send a system greeting message
  await supabaseAdmin.from('chat_messages').insert({
    session_id:  sessionId,
    sender_id:   admin.id,
    sender_name: admin.username ?? 'Support',
    is_agent:    true,
    body:        `Hello! I'm ${admin.username ?? 'a support agent'} and I'm here to help. How can I assist you today?`,
  });

  return res.status(200).json({ success: true });
}
