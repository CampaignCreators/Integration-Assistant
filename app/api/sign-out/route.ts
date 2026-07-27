import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Signs out and returns to the login page.
 *
 * A route rather than a server action so the sign-out link in the header works
 * from a client component without threading an action through it.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url));
}
