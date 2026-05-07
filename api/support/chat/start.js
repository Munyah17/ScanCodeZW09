/**
 * POST /api/support/chat/start
 * Creates a new chat session and puts it in the waiting queue.
 * Body: { guestName, guestEmail, userId? }
 */

import { supabaseAdmin } from '../../_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { guestName, guestEmail, userId } = req.body ?? {};
  if (!guestEmail) return res.status(400).json({ error: 'guestEmail is required.' });

  try {
    const { data, error } = await supabaseAdmin
      .from('chat_sessions')
      .insert({
        user_id:     userId ?? null,
        guest_name:  guestName ?? null,
        guest_email: guestEmail,
        status:      'waiting',
      })
      .select('id, started_at')
      .single();

    if (error) throw error;

    // Count sessions ahead in queue
    const { count: queuePosition } = await supabaseAdmin
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting')
      .lt('started_at', data.started_at);

    return res.status(200).json({
      sessionId:     data.id,
      queuePosition: (queuePosition ?? 0) + 1,
    });
  } catch (err) {
    console.error('[chat/start]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
