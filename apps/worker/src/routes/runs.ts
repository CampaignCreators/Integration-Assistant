import { Router } from "express";
import type { Request, Response } from "express";
import {
  createRunSchema,
  intakeSchema,
  isWorking,
  validateSubmittable,
} from "@cc/shared";
import type { RunRow } from "@cc/shared";
import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";
import { isElevated, requireAuth } from "../middleware/auth.js";
import { deleteRunAndFiles } from "../pipeline/deleteRun.js";
import { resumeRun } from "../pipeline/processRun.js";

export const runsRouter = Router();

runsRouter.use(requireAuth);

/** Loads a run and enforces ownership (or elevated role). */
export async function loadRunChecked(
  req: Request,
  res: Response
): Promise<RunRow | null> {
  const user = req.user!;
  const { data: run, error } = await supabase
    .from("runs")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return null;
  }
  if (!run || (run.user_id !== user.id && !isElevated(user))) {
    res.status(404).json({ error: "Run not found" });
    return null;
  }
  return run as RunRow;
}

// POST /runs — create a run (+ empty brief) in draft status.
runsRouter.post("/", async (req, res) => {
  const parsed = createRunSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  const input = parsed.data;
  const user = req.user!;

  const { data: run, error: runError } = await supabase
    .from("runs")
    .insert({
      user_id: user.id,
      title: input.title ?? null,
      target_software: input.target_software ?? null,
      direction: input.direction ?? null,
      frequency: input.frequency ?? null,
      status: "draft",
    })
    .select("*")
    .single();
  if (runError || !run) {
    res.status(500).json({ error: runError?.message ?? "Failed to create run" });
    return;
  }

  const { data: brief, error: briefError } = await supabase
    .from("brief")
    .insert({
      run_id: run.id,
      objects: input.objects ?? [],
      trigger_event: input.trigger_event ?? null,
      volume: input.volume ?? null,
      description: input.description ?? null,
    })
    .select("*")
    .single();
  if (briefError) {
    res.status(500).json({ error: briefError.message });
    return;
  }

  res.status(201).json({ run, brief });
});

// GET /runs — list runs for the user (all runs for reviewer/admin).
runsRouter.get("/", async (req, res) => {
  const user = req.user!;
  let query = supabase
    .from("runs")
    .select("*")
    .order("created_at", { ascending: false });
  if (!isElevated(user)) {
    query = query.eq("user_id", user.id);
  }
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ runs: data });
});

// GET /runs/:id — run detail (run + brief + uploads).
runsRouter.get("/:id", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;

  const [briefResult, uploadsResult] = await Promise.all([
    supabase.from("brief").select("*").eq("run_id", run.id).maybeSingle(),
    supabase
      .from("uploads")
      .select("id, run_id, storage_path, filename, type, size_bytes, status, created_at, updated_at")
      .eq("run_id", run.id)
      .order("created_at"),
  ]);
  if (briefResult.error) {
    res.status(500).json({ error: briefResult.error.message });
    return;
  }
  if (uploadsResult.error) {
    res.status(500).json({ error: uploadsResult.error.message });
    return;
  }

  res.json({ run, brief: briefResult.data, uploads: uploadsResult.data });
});

/**
 * DELETE /runs/:id — remove a run and every file belonging to it.
 *
 * Discovery transcripts contain client PII (spec §10), so deletion has to reach
 * Storage as well as the database. Restricted to the run's owner and admins:
 * a reviewer can correct a run but not destroy someone else's evidence.
 */
runsRouter.delete("/:id", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;
  const user = req.user!;

  if (run.user_id !== user.id && user.role !== "admin") {
    res.status(403).json({ error: "Only the person who created a run, or an admin, can delete it" });
    return;
  }
  if (isWorking(run.status)) {
    res.status(409).json({
      error: "This run is still being processed. Wait for it to finish, then delete it.",
    });
    return;
  }

  try {
    const report = await deleteRunAndFiles(run.id);
    res.json({ ok: true, ...report });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not delete this run";
    logger.error({ err: message, runId: run.id }, "run deletion failed");
    res.status(500).json({ error: message });
  }
});

/**
 * POST /runs/:id/retry — pick a failed run back up from where it stopped.
 *
 * Distinct from reprocess: this keeps the findings that already succeeded and
 * only re-runs what did not, so a transient failure costs one step rather than
 * a whole run.
 */
runsRouter.post("/:id/retry", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;

  if (run.status !== "failed") {
    res.status(409).json({ error: "Only a failed run can be retried" });
    return;
  }

  // Resume from the furthest phase whose work is already stored.
  const resumeStatus = (await hasAnyFinding(run.id)) ? "researching" : "queued";
  const { error } = await supabase
    .from("runs")
    .update({ status: resumeStatus, error_message: null, heartbeat_at: null })
    .eq("id", run.id)
    .eq("status", "failed");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  await supabase.from("run_events").insert({
    run_id: run.id,
    step: "pipeline",
    status: "started",
    message: "Retrying from where it stopped — finished steps are kept",
  });

  if (resumeStatus === "researching") {
    void resumeRun(run.id).catch((err) => {
      logger.error({ err, runId: run.id }, "retry crashed");
    });
  }
  // A `queued` run is picked up by the poller on its next tick.

  res.json({ ok: true, resumed_at: resumeStatus });
});

async function hasAnyFinding(runId: string): Promise<boolean> {
  const { count } = await supabase
    .from("research_findings")
    .select("id", { count: "exact", head: true })
    .eq("run_id", runId);
  return (count ?? 0) > 0;
}

// PUT /runs/:id/intake — save the guided brief (autosaved between wizard steps).
runsRouter.put("/:id/intake", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;
  if (run.status !== "draft") {
    res.status(409).json({ error: "The brief can only be edited while a run is a draft" });
    return;
  }

  const parsed = intakeSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  const input = parsed.data;

  const runPatch: Record<string, unknown> = {};
  if (input.target_software !== undefined) runPatch.target_software = input.target_software || null;
  if (input.direction !== undefined) runPatch.direction = input.direction;
  if (input.frequency !== undefined) runPatch.frequency = input.frequency;
  if (Object.keys(runPatch).length > 0) {
    const { error } = await supabase.from("runs").update(runPatch).eq("id", run.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  const briefPatch: Record<string, unknown> = {};
  if (input.description !== undefined) briefPatch.description = input.description || null;
  if (input.objects !== undefined) briefPatch.objects = input.objects;
  if (input.trigger_event !== undefined) briefPatch.trigger_event = input.trigger_event || null;
  if (input.volume !== undefined) briefPatch.volume = input.volume;
  if (Object.keys(briefPatch).length > 0) {
    const { error } = await supabase.from("brief").update(briefPatch).eq("run_id", run.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  const [updatedRun, updatedBrief] = await Promise.all([
    supabase.from("runs").select("*").eq("id", run.id).single(),
    supabase.from("brief").select("*").eq("run_id", run.id).single(),
  ]);
  res.json({ run: updatedRun.data, brief: updatedBrief.data });
});

// POST /runs/:id/submit — validate the brief and enqueue processing.
runsRouter.post("/:id/submit", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;
  if (run.status !== "draft") {
    res.status(409).json({ error: "This run has already been submitted" });
    return;
  }

  const { data: brief, error: briefError } = await supabase
    .from("brief")
    .select("objects")
    .eq("run_id", run.id)
    .single();
  if (briefError || !brief) {
    res.status(500).json({ error: briefError?.message ?? "Brief not found" });
    return;
  }

  const problems = validateSubmittable({
    target_software: run.target_software,
    direction: run.direction,
    frequency: run.frequency,
    objects: brief.objects ?? [],
  });
  if (problems.length > 0) {
    res.status(422).json({ error: "The brief is incomplete", problems });
    return;
  }

  const { data: updated, error } = await supabase
    .from("runs")
    .update({ status: "queued", error_message: null })
    .eq("id", run.id)
    .select("*")
    .single();
  if (error || !updated) {
    res.status(500).json({ error: error?.message ?? "Failed to submit run" });
    return;
  }
  await supabase.from("run_events").insert({
    run_id: run.id,
    step: "intake",
    status: "succeeded",
    message: "Brief submitted; run queued for processing",
  });

  res.json({ run: updated });
});
