"use server";

import { revalidatePath } from "next/cache";
import {
  intakeSchema,
  type BriefRow,
  type IntakeInput,
  type RunRow,
} from "@cc/shared";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";

export interface ActionResult {
  ok: boolean;
  error?: string;
  problems?: string[];
}

/** Autosaves the guided brief while the rep moves through the wizard. */
export async function saveIntake(
  runId: string,
  input: IntakeInput
): Promise<ActionResult> {
  const parsed = intakeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Some answers didn't look right — please check the form." };
  }
  try {
    await workerFetch<{ run: RunRow; brief: BriefRow }>(`/runs/${runId}/intake`, {
      method: "PUT",
      body: parsed.data,
    });
    revalidatePath(`/runs/${runId}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof WorkerApiError ? err.message : "Could not save your answers.",
    };
  }
}

/** Submits the run: validates the brief server-side and queues processing. */
export async function submitRun(runId: string): Promise<ActionResult> {
  try {
    await workerFetch<{ run: RunRow }>(`/runs/${runId}/submit`, { method: "POST" });
    revalidatePath(`/runs/${runId}`);
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (err) {
    if (err instanceof WorkerApiError) {
      return { ok: false, error: err.message, problems: err.problems };
    }
    return { ok: false, error: "Could not submit this run." };
  }
}
