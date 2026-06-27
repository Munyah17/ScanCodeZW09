import { requireAdmin }  from '../../_utils/require-admin.js';
import { supabaseAdmin } from '../../_utils/supabase-admin.js';
import { j }             from '../../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  const { auth: admin, error } = await requireAdmin(req);
  if (error) return error;

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { sessionId } = body;
  if (!sessionId) return j({ error: 'sessionId is required.' }, 400);

  const { data: session } = await supabaseAdmin
    .from('chat_sessions')
    .select('status')
    .eq('id', sessionId)
    .single();

  if (!session) return j({ error: 'Session not found.' }, 404);
  if (session.status !== 'waiting') return j({ error: `Session is already ${session.status}.` }, 400);

  const { error: dbErr } = await supabaseAdmin
    .from('chat_sessions')
    .update({ status: 'active', agent_id: admin.id, assigned_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (dbErr) return j({ error: 'Internal server error.' }, 500);

  await supabaseAdmin.from('chat_messages').insert({
    session_id:  sessionId,
    sender_id:   admin.id,
    sender_name: admin.username ?? 'Support',
    is_agent:    true,
    body:        `Hello! I'm ${admin.username ?? 'a support agent'} and I'm here to help. How can I assist you today?`,
  });

  return j({ success: true });
};

export const config = { path: '/api/support/chat/claim' };
