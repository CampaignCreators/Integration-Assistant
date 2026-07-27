/**
 * Supabase is an optional layer, not a prerequisite.
 *
 * Configured, it adds sign-in, saved runs you can come back to from any browser,
 * and the original uploads kept alongside them. Unconfigured, the app still works
 * exactly as it does with nothing set up — one draft, held in localStorage.
 *
 * Optional on purpose: the previous version of this tool required a database
 * before it could do anything, and setting that up was where every attempt to use
 * it stalled. Nothing here should be able to reintroduce that.
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function supabaseConfig(
  env: Record<string, string | undefined> = process.env
): SupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) return null;
  try {
    new URL(url);
  } catch {
    return null;
  }
  return { url, anonKey };
}

export function supabaseEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return supabaseConfig(env) !== null;
}

/**
 * Where a run's uploads live. The first segment is the owner's id, which is what
 * the storage policy checks — so a path can be authorised without a lookup.
 */
export function uploadPath(userId: string, runId: string, filename: string): string {
  return `${userId}/${runId}/${safeFilename(filename)}`;
}

/** Storage keys are URL-ish; keep them boring rather than trusting the filename. */
export function safeFilename(filename: string): string {
  const cleaned = filename
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(-120);
  return cleaned || "upload";
}
