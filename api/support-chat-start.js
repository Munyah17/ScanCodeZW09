import { supabaseAdmin }                            from './_utils/supabase-admin.js';
import { j }                                       from './_utils/response.js';
import { isValidEmail, isValidLength, firstError } from './_utils/validate.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'POST') return j({ error: 'Method not allowed' }, 405);

  let body;
  try { body = await req.json(); } catch { body = {}; }
  const { guestName, guestEmail, userId } = body;

  const err = firstError([
    { check: isValidEmail(guestEmail),                               msg: 'A valid email address is required.' },
    { check: !guestName || isValidLength(guestName, 1, 100),         msg: 'Name must be 1â€“100 characters.' },
  ]);
  if (err) return j({ error: err }, 400);

  try {
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert({ user_id: userId ?? null, guest_name: guestName ?? null, guest_email: guestEmail, status: 'waiting' })
      .select('id, started_at')
      .single();

    if (error) throw error;

    const { count: queuePosition } = await supabaseAdmin
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .lt('started_at', data.started_at);

    return j({ sessionId: data.id, queuePosition: (queuePosition ?? 0) + 1 });
  } catch (err) {
    console.error('[chat/start]', err.message);
    return j({ error: 'Internal server error.' }, 500);
  }
};

export const config = { path: '/api/support/chat/start' };
