/**
 * One-click sign-in for local development.
 *
 * This is deliberately **not** an auth bypass. It signs in as a real seeded user
 * with a real password, so the session, RLS, roles and every downstream check
 * behave exactly as they do in production — the only thing removed is the trip
 * through the mail catcher. There is no code path here that grants access
 * without Supabase issuing a session.
 *
 * Three independent conditions must all hold, so it cannot switch itself on in a
 * deployment: the build is not production, credentials are explicitly
 * configured, and the Supabase project is a local one. Any single one of those
 * failing disables it.
 */

export interface LocalDevCredentials {
  email: string;
  password: string;
}

/** `new URL(...).hostname` keeps the brackets on IPv6 literals. */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

export function isLocalSupabaseUrl(rawUrl: string | undefined): boolean {
  if (!rawUrl) return false;
  try {
    return LOCAL_HOSTS.has(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

export function localDevCredentials(
  env: Record<string, string | undefined> = process.env
): LocalDevCredentials | null {
  if (env.NODE_ENV === "production") return null;

  const email = env.LOCAL_DEV_EMAIL?.trim();
  const password = env.LOCAL_DEV_PASSWORD;
  if (!email || !password) return null;

  // Refuse against anything but a local Supabase, so a copied .env.local can
  // never hand out a session on a real project.
  if (!isLocalSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL)) return null;

  return { email, password };
}
