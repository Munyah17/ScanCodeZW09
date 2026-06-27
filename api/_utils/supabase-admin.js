/**
 * Supabase admin client for server-side (API functions) use only.
 * Uses the service-role key — bypasses Row Level Security.
 * NEVER import this in browser/frontend code.
 */
import { createClient } from '@supabase/supabase-js';

let _client = null;

function getAdmin() {
  if (_client) return _client;

  const supabaseUrl        = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables.');
  }

  _client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { timeout: 0 },  // disabled — serverless functions don't subscribe to realtime
  });
  return _client;
}

// Lazy proxy — initialises client once on first property access
export const supabaseAdmin = new Proxy({}, {
  get(_target, prop) {
    return getAdmin()[prop];
  },
});
