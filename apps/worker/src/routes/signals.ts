import { Router } from "express";
import { z } from "zod";
import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { runResearchPhase } from "../pipeline/processRun.js";
import { regenerateDeliverables } from "../pipeline/regenerate.js";
import { PermanentStepError } from "../pipeline/runner.js";
import { loadRunChecked } from "./runs.js";

export const signalsRouter = Router({ mergeParams: true });

signalsRouter.use(requireAuth);

const confirmSchema = z.object({
  /** Signals the rep removed as wrong or irrelevant. */
  rejected_signal_ids: z.array(z.string().uuid()).default([]),
  /** Conflicts the rep resolved in favour of the brief as it stands. */
  resolved_conflict_ids: z.array(z.string().uuid()).default([]),
});

// GET /runs/:id/signals — extracted signals for the confirmation step.
signalsRouter.get("/signals", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;

  const { data, error } = await supabase
    .from("extracted_signals")
    .select("*")
    .eq("run_id", run.id)
    .order("conflict_with_brief", { ascending: false })
    .order("created_at");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ signals: data });
});

// POST /runs/:id/confirm-signals — accept the extraction and start research.
signalsRouter.post("/confirm-signals", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;
  if (run.status !== "awaiting_confirmation") {
    res.status(409).json({
      error: "This run is not waiting for confirmation",
    });
    return;
  }

  const parsed = confirmSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  const { rejected_signal_ids, resolved_conflict_ids } = parsed.data;

  if (rejected_signal_ids.length > 0) {
    const { error } = await supabase
      .from("extracted_signals")
      .delete()
      .eq("run_id", run.id)
      .in("id", rejected_signal_ids);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  // A resolved conflict stops being a conflict, so research can use the signal.
  if (resolved_conflict_ids.length > 0) {
    const { error } = await supabase
      .from("extracted_signals")
      .update({ conflict_with_brief: false })
      .eq("run_id", run.id)
      .in("id", resolved_conflict_ids);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  const { data: updated, error: statusError } = await supabase
    .from("runs")
    .update({ status: "researching", error_message: null })
    .eq("id", run.id)
    .eq("status", "awaiting_confirmation") // guard against a double click
    .select("*")
    .maybeSingle();
  if (statusError) {
    res.status(500).json({ error: statusError.message });
    return;
  }
  if (!updated) {
    res.status(409).json({ error: "This run has already been confirmed" });
    return;
  }

  // Research takes minutes — run it in the background and let the UI follow
  // along via run_events rather than holding the request open.
  void runResearchPhase(run.id).catch((err) => {
    logger.error({ err, runId: run.id }, "research phase crashed");
  });

  res.json({ run: updated });
});

// GET /runs/:id/findings — research findings with their sources.
signalsRouter.get("/findings", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;

  const { data, error } = await supabase
    .from("research_findings")
    .select("*")
    .eq("run_id", run.id);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ findings: data });
});

/**
 * POST /runs/:id/generate — rebuild the deliverables from current data.
 *
 * Used after a reviewer edits the mapping table. Does not re-run the mapping
 * builder, so corrections survive.
 */
signalsRouter.post("/generate", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;
  if (run.status !== "complete") {
    res.status(409).json({
      error: "Documents can only be rebuilt once a run has finished",
    });
    return;
  }

  try {
    await regenerateDeliverables(run.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not rebuild documents";
    logger.error({ err: message, runId: run.id }, "regenerate failed");
    res.status(err instanceof PermanentStepError ? 409 : 500).json({ error: message });
    return;
  }

  res.json({ ok: true });
});

/**
 * POST /runs/:id/reprocess — run the research pipeline again, reusing the
 * uploads and brief already captured (spec §7).
 *
 * Clears the previous findings and recommendation so steps genuinely re-run
 * rather than skipping themselves as already-done.
 */
signalsRouter.post("/reprocess", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;
  if (run.status !== "complete" && run.status !== "failed") {
    res.status(409).json({ error: "This run is still in progress" });
    return;
  }

  const [findings, mappings, runReset] = await Promise.all([
    supabase.from("research_findings").delete().eq("run_id", run.id),
    supabase.from("field_mappings").delete().eq("run_id", run.id),
    supabase
      .from("runs")
      .update({
        recommended_approach: null,
        confidence: null,
        approach_rationale: null,
        approach_details_json: null,
        mapping_meta_json: null,
        error_message: null,
        status: "researching",
      })
      .eq("id", run.id),
  ]);
  const failure = findings.error ?? mappings.error ?? runReset.error;
  if (failure) {
    res.status(500).json({ error: failure.message });
    return;
  }

  await supabase.from("run_events").insert({
    run_id: run.id,
    step: "pipeline",
    status: "started",
    message: "Re-running research on the existing files and answers",
  });

  void runResearchPhase(run.id).catch((err) => {
    logger.error({ err, runId: run.id }, "reprocess crashed");
  });

  res.json({ ok: true });
});

// GET /runs/:id/events — pipeline progress log.
signalsRouter.get("/events", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;

  const { data, error } = await supabase
    .from("run_events")
    .select("*")
    .eq("run_id", run.id)
    .order("ts");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ events: data });
});
