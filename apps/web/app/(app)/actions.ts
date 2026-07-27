"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { workerFetch } from "@/lib/worker-api";
import type { BriefRow, RunRow } from "@cc/shared";

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createRun(): Promise<void> {
  const { run } = await workerFetch<{ run: RunRow; brief: BriefRow }>("/runs", {
    method: "POST",
    body: {},
  });
  redirect(`/runs/${run.id}`);
}
