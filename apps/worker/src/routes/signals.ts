import { Router } from "express";
import { z } from "zod";
import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { runResearchPhase } from "../pipeline/processRun.js";
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
