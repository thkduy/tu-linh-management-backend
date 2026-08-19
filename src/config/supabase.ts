import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

/**
 * Supabase clients.
 *
 * - `supabase` (publishable key): used for end-user authentication flows (login/logout,
 *   token validation). Respects Row Level Security.
 * - `supabaseAdmin` (secret key): used ONLY on the backend for privileged
 *   operations (creating auth users, deleting auth users). It BYPASSES RLS and
 *   must never be exposed to the client.
 */
export const supabase: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export const supabaseAdmin: SupabaseClient = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SECRET_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
);
