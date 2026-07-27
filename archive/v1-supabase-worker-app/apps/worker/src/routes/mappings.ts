import { Router } from "express";
import {
  updateMappingsSchema,
  type FieldMappingRow,
  type MappingRowInput,
} from "@cc/shared";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { planMappingSync } from "./mapping-sync.js";
import { loadRunChecked } from "./runs.js";

export const mappingsRouter = Router({ mergeParams: true });

mappingsRouter.use(requireAuth);

// GET /runs/:id/mappings — rows of the data mapping table, in display order.
mappingsRouter.get("/mappings", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;

  const { data, error } = await supabase
    .from("field_mappings")
    .select("*")
    .eq("run_id", run.id)
    .order("position");
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ mappings: data, mapping_meta: run.mapping_meta_json });
});

/**
 * PATCH /runs/:id/mappings — reviewer corrections (spec §7).
 *
 * The body carries the complete desired table. Rows with an `id` are updated,
 * rows without are inserted, and rows absent from the body are deleted, so the
 * edit is idempotent and array order sets the display order. Every touched row
 * records who changed it.
 */
mappingsRouter.patch("/mappings", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;
  const user = req.user!;

  const parsed = updateMappingsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  const { rows, match_strategy, gaps } = parsed.data;

  const { data: current, error: readError } = await supabase
    .from("field_mappings")
    .select("id")
    .eq("run_id", run.id);
  if (readError) {
    res.status(500).json({ error: readError.message });
    return;
  }

  const plan = planMappingSync(
    (current ?? []).map((row) => row.id as string),
    rows
  );

  // Reject ids that belong to a different run rather than silently inserting.
  if (plan.unknownIds.length > 0) {
    res.status(400).json({
      error: "Some rows refer to mappings that do not belong to this run",
    });
    return;
  }

  const editStamp = { edited_by: user.id, edited_at: new Date().toISOString() };

  if (plan.deletes.length > 0) {
    const { error } = await supabase
      .from("field_mappings")
      .delete()
      .eq("run_id", run.id)
      .in("id", plan.deletes);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  for (const { id, row, position } of plan.updates) {
    const { error } = await supabase
      .from("field_mappings")
      .update({ ...toColumns(row), position, ...editStamp })
      .eq("id", id)
      .eq("run_id", run.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  for (const { row, position } of plan.inserts) {
    const { error } = await supabase
      .from("field_mappings")
      .insert({ run_id: run.id, ...toColumns(row), position, ...editStamp });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  if (match_strategy !== undefined || gaps !== undefined) {
    const meta = run.mapping_meta_json ?? { match_strategy: "", gaps: [] };
    const { error } = await supabase
      .from("runs")
      .update({
        mapping_meta_json: {
          match_strategy: match_strategy ?? meta.match_strategy,
          gaps: gaps ?? meta.gaps,
        },
      })
      .eq("id", run.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  const { data: saved, error: finalError } = await supabase
    .from("field_mappings")
    .select("*")
    .eq("run_id", run.id)
    .order("position");
  if (finalError) {
    res.status(500).json({ error: finalError.message });
    return;
  }

  res.json({ mappings: saved as FieldMappingRow[] });
});

function toColumns(row: MappingRowInput) {
  return {
    source_obj: row.source_obj,
    source_field: row.source_field,
    target_obj: row.target_obj,
    target_field: row.target_field,
    direction: row.direction,
    transform: row.transform,
    required: row.required,
    match_key: row.match_key,
    notes: row.notes,
  };
}
