import { config } from "../config.js";
import { logger } from "./logger.js";
import { supabase } from "./supabase.js";

/**
 * Runtime settings an admin can change without a redeploy. Cached briefly so
 * the poller can consult the cap on every tick without a query each time.
 */

const CACHE_TTL_MS = 30_000;

let cached: { value: number; readAt: number } | null = null;

export async function maxConcurrentRuns(): Promise<number> {
  if (cached && Date.now() - cached.readAt < CACHE_TTL_MS) {
    return cached.value;
  }

  const { data, error } = await supabase
    .from("app_settings")
    .select("max_concurrent_runs")
    .eq("id", true)
    .maybeSingle();

  if (error || !data) {
    // Fall back to the env default rather than stalling the queue.
    if (error) {
      logger.warn({ err: error.message }, "could not read app_settings; using env default");
    }
    cached = { value: config.maxConcurrentRuns, readAt: Date.now() };
    return cached.value;
  }

  cached = { value: data.max_concurrent_runs as number, readAt: Date.now() };
  return cached.value;
}

/** Called after an admin writes settings so the change takes effect at once. */
export function invalidateSettingsCache(): void {
  cached = null;
}
