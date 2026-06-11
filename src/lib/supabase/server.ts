// Server-side Supabase client (App Router, cookie-based sessions).
//
// Used in Server Components / route handlers to read the current session.
// Returns null in demo mode (env unset) so SSR fetches proceed unauthenticated.

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(URL && ANON);

/** Server client bound to the request cookies, or null in demo mode. */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!supabaseEnabled) return null;
  const cookieStore = await cookies();
  return createServerClient(URL!, ANON!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        // In a Server Component cookies are read-only; session refresh is
        // handled by middleware, so swallow writes here.
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          /* read-only context */
        }
      },
    },
  });
}

/** Current access token from request cookies (for forwarding to the API). */
export async function getServerAccessToken(): Promise<string | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
