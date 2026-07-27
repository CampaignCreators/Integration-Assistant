import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Completes the magic-link flow and sets the session.
 *
 * A link can arrive in two shapes, and which one depends on the email template
 * rather than on anything this app controls:
 *
 *   ?token_hash=…&type=…  a template written with `{{ .TokenHash }}`, verified here
 *   ?code=…               the default `{{ .ConfirmationURL }}`, which bounces
 *                         through Supabase's /verify endpoint and comes back as a
 *                         PKCE code to exchange
 *
 * Handling only the first is why sign-in failed: nothing in the default setup
 * produces a token_hash, so every link fell through to the error branch.
 *
 * A third shape — tokens in the URL fragment (`#access_token=…`) — never reaches
 * a server route at all, so the browser arrives here with no parameters. That is
 * reported explicitly rather than looking like nothing happened.
 */
/**
 * Sends the caller back to the login screen with something readable, and puts
 * the full text in the server log. Supabase's auth errors run to several
 * sentences of SDK guidance — useful in a terminal, not in a red box.
 */
function failToLogin(message: string): never {
  console.error("auth/confirm failed:", message);
  const short = message.length > 120 ? `${message.slice(0, 117)}…` : message;
  redirect(`/login?error=${encodeURIComponent(short)}`);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // Supabase reports its own failures on the redirect, not in a response body.
  const reported = searchParams.get("error_description") ?? searchParams.get("error");
  if (reported) failToLogin(reported);

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect("/dashboard");
    failToLogin(error.message);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect("/dashboard");
    failToLogin(error.message);
  }

  // Nothing usable arrived. Log the shape that did — a blank page here is close
  // to impossible to diagnose from the outside.
  console.error("auth/confirm: query keys were", [...searchParams.keys()]);
  failToLogin("That sign-in link was missing its token. Request a new one.");
}
