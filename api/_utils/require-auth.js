import { supabaseAdmin } from './supabase-admin.js';
import { j }             from './response.js';

export async function requireAuth(req) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/, '') || null;

  if (!token) return { auth: null, error: j({ error: 'Missing authorization token.' }, 401) };

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { auth: null, error: j({ error: 'Invalid or expired token.' }, 401) };

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, username, subscription_type, enterprise_config, user_type')
    .eq('id', user.id)
    .single();

  return { auth: { userId: user.id, email: user.email, profile }, error: null };
}
