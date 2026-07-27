"use server";

import { redirect } from "next/navigation";
import { localDevCredentials } from "@/lib/local-dev";
import { createClient } from "@/lib/supabase/server";

export async function sendMagicLink(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect("/login?error=Please%20enter%20your%20email");
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl}/auth/confirm` },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/login?sent=1");
}

/**
 * Signs in as the seeded local development user — a real password sign-in, not a
 * bypass. The guards live in localDevCredentials(); if any of them fail this
 * refuses rather than falling back to anything weaker.
 */
export async function signInAsLocalUser(): Promise<void> {
  const credentials = localDevCredentials();
  if (!credentials) {
    redirect("/login?error=Local%20sign-in%20is%20not%20enabled%20here");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(
        `${error.message}. Re-run "npm run local:setup" to recreate the local demo user.`
      )}`
    );
  }
  redirect("/dashboard");
}
