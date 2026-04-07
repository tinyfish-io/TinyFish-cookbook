import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "./env";

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;

  const env = getEnv();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase environment variables not configured");
  }

  _client = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    }
  );

  return _client;
}

export function tryGetSupabase(): SupabaseClient | null {
  try {
    const env = getEnv();
    if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
      return null;
    }
    return getSupabaseAdmin();
  } catch {
    console.warn(
      "[PHARMACY] [CACHE] Supabase not configured — caching disabled"
    );
    return null;
  }
}
