/**
 * Supabase admin client for server-side (API functions) use only.
 * Uses the service-role key — bypasses Row Level Security.
 * NEVER import this in browser/frontend code.
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl         = process.env.SUPABASE_URL;
const supabaseServiceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
