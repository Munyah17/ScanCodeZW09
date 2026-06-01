import { supabaseAdmin } from '../../_utils/supabase-admin.js';
import { j }             from '../../_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { sessionId, reason = 'user' } = body;
  if (!sessionId) return j({ error: 'sessionId is required.' }, 400);

  const status = reason === 'timed_out' ? 'timed_out' : 'ended';

  const { error } = await supabaseAdmin
    .from('chat_sessions')
    .update({ status, ended_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) return j({ error: error.message }, 500);
  return j({ success: true });
};

export const config = { path: '/api/support/chat/end' };
