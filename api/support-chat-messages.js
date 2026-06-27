import { supabaseAdmin } from './_utils/supabase-admin.js';
import { j }             from './_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const sessionId = new URL(req.url).searchParams.get('sessionId');
  if (!sessionId) return j({ error: 'Missing sessionId.' }, 400);

  const { data, error } = await supabaseAdmin
    .from('chat_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[support/chat/messages]', error.message);
    return j({ error: 'Internal server error.' }, 500);
  }
  return j({ messages: data ?? [] });
};

export const config = { path: '/api/support/chat/messages' };
