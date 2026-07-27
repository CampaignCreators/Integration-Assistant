import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

/** Service-role client: bypasses RLS. Server-side only. */
export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  { auth: { persistSession: false, autoRefreshToken: false } }
);
