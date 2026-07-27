import { randomUUID } from "node:crypto";

/**
 * Storage keys are always `<run_id>/<uuid>-<safe filename>`. The run-id prefix
 * is what the Storage RLS policies and the upload-registration guard both key
 * off, so it must never be user-controlled.
 */

export function sanitizeFilename(filename: string): string {
  const cleaned = filename.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^\.+/, "");
  // Keep the tail so the extension survives a very long name.
  const trimmed = cleaned.slice(-100);
  return trimmed === "" ? "file" : trimmed;
}

export function buildUploadPath(runId: string, filename: string): string {
  return `${runId}/${randomUUID()}-${sanitizeFilename(filename)}`;
}

/**
 * Guards registration: a rep must not be able to attach a Storage object that
 * belongs to a different run (or escape the run folder) to their own run.
 */
export function isPathWithinRun(storagePath: string, runId: string): boolean {
  if (storagePath.includes("..") || storagePath.startsWith("/")) return false;
  const rest = storagePath.slice(`${runId}/`.length);
  return (
    storagePath.startsWith(`${runId}/`) && rest.length > 0 && !rest.includes("/")
  );
}
