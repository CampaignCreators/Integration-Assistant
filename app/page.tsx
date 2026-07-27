import { supabaseEnabled } from "@/lib/supabase/config";
import { currentUser } from "@/lib/supabase/server";
import { Workspace } from "@/components/workspace";

/**
 * Decides, on the server, whether this instance has saved runs and a signed-in
 * user, and hands that to the workspace. The middleware has already redirected an
 * unauthenticated visitor when Supabase is configured, so reaching here means
 * either signed in, or no Supabase at all.
 */
export default async function Page() {
  const enabled = supabaseEnabled();
  const user = enabled ? await currentUser() : null;

  return <Workspace persistence={enabled} email={user?.email ?? null} />;
}
