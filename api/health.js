import { supabaseAdmin } from './_utils/supabase-admin.js';
import { j }             from './_utils/response.js';

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 200 });
  if (req.method !== 'GET') return j({ error: 'Method not allowed' }, 405);

  const start = Date.now();
  let dbOk = false;
  let dbMs  = null;

  try {
    const { error } = await supabaseAdmin
      .from('subscription_plans')
      .select('id')
      .limit(1)
      .single();
    dbOk = !error;
    dbMs = Date.now() - start;
  } catch {
    dbMs = Date.now() - start;
  }

  return j({
    status:    dbOk ? 'ok' : 'degraded',
    db:        dbOk ? 'connected' : 'unreachable',
    db_ms:     dbMs,
    timestamp: new Date().toISOString(),
    version:   '1.0.0',
  }, dbOk ? 200 : 503);
};

export const config = { path: '/api/health' };
