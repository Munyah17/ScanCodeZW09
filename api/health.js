/**
 * GET /api/health
 * Public endpoint — returns service status and DB connectivity.
 * Used by Vercel deployment checks and uptime monitors.
 */

import { supabaseAdmin } from './_utils/supabase-admin.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ error: 'Method not allowed' }); return; }

  const start = Date.now();
  let dbOk  = false;
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

  const status = dbOk ? 200 : 503;
  res.status(status).json({
    status:    dbOk ? 'ok' : 'degraded',
    db:        dbOk ? 'connected' : 'unreachable',
    db_ms:     dbMs,
    timestamp: new Date().toISOString(),
    version:   '1.0.0',
  });
}
