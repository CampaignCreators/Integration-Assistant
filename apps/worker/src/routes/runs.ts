import { Router } from "express";
import type { Request, Response } from "express";
import { createRunSchema } from "@cc/shared";
import type { RunRow } from "@cc/shared";
import { supabase } from "../lib/supabase.js";
import { isElevated, requireAuth } from "../middleware/auth.js";

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
