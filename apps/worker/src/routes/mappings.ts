import { Router } from "express";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
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
  res.json({ mappings: data });
});
