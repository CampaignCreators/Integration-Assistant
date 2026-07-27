import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "./config";

/** Reachable without a session. */
const PUBLIC_PATHS = ["/login", "/auth"];

/**
 * Refreshes the session on each request and keeps unauthenticated callers out.
 *
 * When Supabase isn't configured this does nothing at all — no redirect, no
 * cookie work — so the app stays usable with zero setup.
 */
export async function updateSession(request: NextRequest) {
  const config = supabaseConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not put logic between creating the client and getUser() — it causes
  // intermittent sign-outs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (user || PUBLIC_PATHS.some((path) => pathname.startsWith(path))) return response;

  // An API call should hear "401", not be handed a login page as JSON.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}
