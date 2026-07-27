import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

/**
 * Server-side client carrying the caller's session, so every query runs as that
 * user and row-level security does the enforcing.
 *
 * Returns null when Supabase isn't configured; callers treat that as "no
 * persistence" rather than as an error.
 */
export async function createClient() {
  const config = supabaseConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component; the middleware refreshes sessions.
        }
      },
    },
  });
}

/** The signed-in user, or null. Never throws, so callers can branch simply. */
export async function currentUser() {
  const supabase = await createClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
