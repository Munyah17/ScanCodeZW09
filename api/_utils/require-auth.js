import { supabaseAdmin } from './supabase-admin.js';
import { j }             from './response.js';

export async function requireAuth(req) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/, '') || null;

  if (!token) return { auth: null, error: j({ error: 'Missing authorization token.' }, 401) };

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { auth: null, error: j({ error: 'Invalid or expired token.' }, 401) };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, username, subscription_type, enterprise_config, user_type, otg_credits')
    .eq('id', user.id)
    .maybeSingle();

  // If profile doesn't exist, create a default one
  if (!profile) {
    try {
      await supabaseAdmin.from('profiles').insert({
        id: user.id,
        username: user.user_metadata?.username ?? user.email?.split('@')[0] ?? 'user',
        subscription_type: 'free',
        user_type: 'user',
      });
    } catch { /* profile may already exist, silently continue */ }
  }

  return { auth: { userId: user.id, email: user.email, profile }, error: null };
}
