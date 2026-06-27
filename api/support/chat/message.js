import { supabaseAdmin }                                        from '../../_utils/supabase-admin.js';
import { j }                                                   from '../../_utils/response.js';
import { isValidUuid, isValidLength, firstError }              from '../../_utils/validate.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { sessionId, senderName, body: msgBody, isAgent = false, senderId } = body;

  const err = firstError([
    { check: isValidUuid(sessionId),                  msg: 'Invalid sessionId.' },
    { check: isValidLength(senderName, 1, 100),       msg: 'senderName must be 1–100 characters.' },
    { check: isValidLength(msgBody, 1, 2000),         msg: 'Message must be 1–2000 characters.' },
  ]);
  if (err) return j({ error: err }, 400);

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
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/support/chat/message' };
