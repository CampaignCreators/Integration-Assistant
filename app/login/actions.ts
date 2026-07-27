"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Email and password sign-in. Accounts are created by an admin in the Supabase
 * dashboard — there is no self-signup, and deliberately no magic link: email
 * delivery was the single biggest source of trouble in the previous version, and
 * a handful of internal users do not need it.
 */
export async function signIn(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=Enter%20your%20email%20and%20password");
  }

  const supabase = await createClient();
  if (!supabase) redirect("/");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/");
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase?.auth.signOut();
  redirect("/login");
}
