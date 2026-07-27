import { Router } from "express";
import { DELIVERABLE_KINDS, type DeliverableKind } from "@cc/shared";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { DELIVERABLES_BUCKET } from "../render/store.js";
import { loadRunChecked } from "./runs.js";

export const deliverablesRouter = Router({ mergeParams: true });

deliverablesRouter.use(requireAuth);

const SIGNED_URL_TTL_SECONDS = 300;

// GET /runs/:id/deliverables — what has been generated for this run.
deliverablesRouter.get("/deliverables", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;

  const { data, error } = await supabase
    .from("deliverables")
    .select("*")
    .eq("run_id", run.id)
    .order("version", { ascending: false });
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  res.json({ deliverables: data });
});

// GET /runs/:id/deliverables/:kind — short-lived signed download URL.
deliverablesRouter.get("/deliverables/:kind", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;

  const kind = req.params.kind as DeliverableKind;
  if (!DELIVERABLE_KINDS.includes(kind)) {
    res.status(400).json({ error: "Unknown deliverable" });
    return;
  }

  // Latest version unless one is named explicitly.
  const requested = req.query.version;
  let query = supabase
    .from("deliverables")
    .select("*")
    .eq("run_id", run.id)
    .eq("kind", kind);
  if (typeof requested === "string" && /^\d+$/.test(requested)) {
    query = query.eq("version", Number(requested));
  }

  const { data, error } = await query.order("version", { ascending: false }).limit(1);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  const deliverable = data?.[0];
  if (!deliverable) {
    res.status(404).json({ error: "That file has not been generated yet" });
    return;
  }

  const filename = deliverable.storage_path.split("/").pop() ?? "download";
  const { data: signed, error: signError } = await supabase.storage
    .from(DELIVERABLES_BUCKET)
    .createSignedUrl(deliverable.storage_path, SIGNED_URL_TTL_SECONDS, {
      download: filename,
    });
  if (signError || !signed) {
    res.status(500).json({ error: signError?.message ?? "Could not create a link" });
    return;
  }

  res.json({
    url: signed.signedUrl,
    filename,
    version: deliverable.version,
    expires_in: SIGNED_URL_TTL_SECONDS,
  });
});
