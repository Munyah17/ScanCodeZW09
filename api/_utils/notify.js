import { supabaseAdmin } from './supabase-admin.js';

/**
 * Insert an in-app notification for a user. Never throws — notification
 * failures must not break the payment/webhook flow that triggered them.
 */
export async function notify(userId, title, message, type = 'info') {
  try {
    const { error } = await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
    });
    if (error) console.warn('[notify] insert failed:', error.message);
  } catch (err) {
    console.warn('[notify] insert failed:', err.message);
  }
}
