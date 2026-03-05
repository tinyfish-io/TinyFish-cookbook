import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

let _client: SupabaseClient | null = null;

/**
 * Server-side Supabase client using service role key.
 * Used for cache reads/writes in API routes only.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const env = getEnv();

  _client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  return _client;
}
