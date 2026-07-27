import { Router } from "express";
import { registerUploadsSchema, uploadUrlSchema } from "@cc/shared";
import { extractText, uploadTypeFromFilename } from "../extract/text.js";
import { logger } from "../lib/logger.js";
import { buildUploadPath, isPathWithinRun } from "../lib/storage-paths.js";
import { supabase } from "../lib/supabase.js";
import { requireAuth } from "../middleware/auth.js";
import { loadRunChecked } from "./runs.js";

export const uploadsRouter = Router({ mergeParams: true });

uploadsRouter.use(requireAuth);

const UPLOADS_BUCKET = "uploads";

// POST /runs/:id/upload-url — mint a signed Storage upload URL so the browser
// uploads directly to Supabase Storage (files never pass through the worker).
uploadsRouter.post("/upload-url", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;
  if (run.status !== "draft") {
    res.status(409).json({ error: "Files can only be added while a run is a draft" });
    return;
  }

  const parsed = uploadUrlSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  const { filename } = parsed.data;
  const type = uploadTypeFromFilename(filename);
  if (!type) {
    res.status(400).json({
      error: "Unsupported file type. Use .txt, .md, .docx, .pdf, .vtt, or .srt.",
    });
    return;
  }

  const storagePath = buildUploadPath(run.id, filename);
  const { data, error } = await supabase.storage
    .from(UPLOADS_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (error || !data) {
    res.status(500).json({ error: error?.message ?? "Failed to create upload URL" });
    return;
  }

  res.json({
    signed_url: data.signedUrl,
    token: data.token,
    storage_path: data.path,
    type,
  });
});

// POST /runs/:id/uploads — register objects already uploaded to Storage,
// then extract their text server-side (spec §5.1.1).
uploadsRouter.post("/uploads", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;
  if (run.status !== "draft") {
    res.status(409).json({ error: "Files can only be added while a run is a draft" });
    return;
  }

  const parsed = registerUploadsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }

  const registered = [];
  for (const item of parsed.data.uploads) {
    if (!isPathWithinRun(item.storage_path, run.id)) {
      res.status(400).json({ error: "storage_path does not belong to this run" });
      return;
    }

    const { data: row, error: insertError } = await supabase
      .from("uploads")
      .insert({
        run_id: run.id,
        storage_path: item.storage_path,
        filename: item.filename,
        type: item.type,
        size_bytes: item.size_bytes,
        status: "uploaded",
      })
      .select("*")
      .single();
    if (insertError || !row) {
      res.status(500).json({ error: insertError?.message ?? "Failed to register upload" });
      return;
    }

    // Extract text inline — files are small and this keeps the intake flow
    // synchronous; a failure marks the row but doesn't block other files.
    try {
      const { data: blob, error: downloadError } = await supabase.storage
        .from(UPLOADS_BUCKET)
        .download(item.storage_path);
      if (downloadError || !blob) {
        throw new Error(downloadError?.message ?? "download failed");
      }
      const buffer = Buffer.from(await blob.arrayBuffer());
      const text = await extractText(buffer, item.type);
      await supabase
        .from("uploads")
        .update({ extracted_text: text, status: "extracted" })
        .eq("id", row.id);
      registered.push({ ...row, status: "extracted" });
    } catch (err) {
      logger.warn({ err, uploadId: row.id }, "text extraction failed");
      await supabase.from("uploads").update({ status: "failed" }).eq("id", row.id);
      registered.push({ ...row, status: "failed" });
    }
  }

  res.status(201).json({ uploads: registered });
});

// DELETE /runs/:id/uploads/:uploadId — remove a file before submitting.
uploadsRouter.delete("/uploads/:uploadId", async (req, res) => {
  const run = await loadRunChecked(req, res);
  if (!run) return;
  if (run.status !== "draft") {
    res.status(409).json({ error: "Files can only be removed while a run is a draft" });
    return;
  }

  const { data: upload, error } = await supabase
    .from("uploads")
    .select("id, storage_path")
    .eq("id", req.params.uploadId)
    .eq("run_id", run.id)
    .maybeSingle();
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }
  if (!upload) {
    res.status(404).json({ error: "Upload not found" });
    return;
  }

  const { error: storageError } = await supabase.storage
    .from(UPLOADS_BUCKET)
    .remove([upload.storage_path]);
  if (storageError) {
    logger.warn({ err: storageError.message }, "failed to delete storage object");
  }
  const { error: deleteError } = await supabase
    .from("uploads")
    .delete()
    .eq("id", upload.id);
  if (deleteError) {
    res.status(500).json({ error: deleteError.message });
    return;
  }

  res.json({ ok: true });
});
