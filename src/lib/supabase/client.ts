// Browser-side Supabase client.
//
// Auth is OPTIONAL: when NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY are unset the app
// runs in demo mode — no login gate, no auth header — exactly as before. These
// helpers return null in that case so callers can no-op cleanly.

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** True when Supabase auth/persistence is configured for the frontend. */
export const supabaseEnabled = Boolean(URL && ANON);

let _client: SupabaseClient | null = null;

/** Memoized browser client, or null in demo mode. */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!supabaseEnabled) return null;
  if (_client === null) {
    _client = createBrowserClient(URL!, ANON!);
  }
  return _client;
}

/** Current access token (for the API Authorization header), or null. */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
