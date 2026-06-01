import { supabaseAdmin } from '../../_utils/supabase-admin.js';
import { j }             from '../../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { sessionId, senderName, body: msgBody, isAgent = false, senderId } = body;
  if (!sessionId || !msgBody || !senderName) {
    return j({ error: 'sessionId, senderName, and body are required.' }, 400);
  }

  try {
    const { data: session } = await supabaseAdmin
      .from('chat_sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    if (!session) return j({ error: 'Session not found.' }, 404);
    if (session.status === 'ended' || session.status === 'timed_out') {
      return j({ error: 'Cannot send messages to a closed session.' }, 400);
    }

    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({ session_id: sessionId, sender_id: senderId ?? null, sender_name: senderName, is_agent: isAgent, body: msgBody })
      .select('id, created_at')
      .single();

    if (error) throw error;
    return j({ messageId: data.id, created_at: data.created_at });
  } catch (err) {
    console.error('[chat/message]', err.message);
    return j({ error: err.message }, 500);
  }
};

export const config = { path: '/api/support/chat/message' };
