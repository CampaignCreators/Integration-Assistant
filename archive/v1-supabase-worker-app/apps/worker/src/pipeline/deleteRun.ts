import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";
import { DELIVERABLES_BUCKET } from "../render/store.js";

const UPLOADS_BUCKET = "uploads";

export interface DeletionReport {
  uploadsRemoved: number;
  deliverablesRemoved: number;
  storageErrors: string[];
}

/**
 * Deletes a run, its uploaded discovery material, and its generated documents
 * (spec §10 privacy, acceptance criterion 7).
 *
 * Storage is cleared first. Deleting the database row cascades to every child
 * table, which would otherwise leave the file objects behind with nothing
 * pointing at them — orphaned client PII no one knows exists.
 *
 * Objects are enumerated from Storage rather than from the `uploads` and
 * `deliverables` tables, so a file whose registration failed part-way through
 * still gets removed.
 */
export async function deleteRunAndFiles(runId: string): Promise<DeletionReport> {
  const report: DeletionReport = {
    uploadsRemoved: 0,
    deliverablesRemoved: 0,
    storageErrors: [],
  };

  report.uploadsRemoved = await purgeBucket(UPLOADS_BUCKET, runId, report);
  report.deliverablesRemoved = await purgeBucket(DELIVERABLES_BUCKET, runId, report);

  const { error } = await supabase.from("runs").delete().eq("id", runId);
  if (error) {
    throw new Error(`Failed to delete the run: ${error.message}`);
  }

  logger.info({ runId, ...report }, "run and files deleted");
  return report;
}

/**
 * Removes every object under a run's prefix, walking one level of nesting —
 * uploads sit at `<run_id>/<file>` and deliverables at `<run_id>/v1/<file>`.
 */
async function purgeBucket(
  bucket: string,
  runId: string,
  report: DeletionReport
): Promise<number> {
  const paths = await listPathsRecursive(bucket, runId, report);
  if (paths.length === 0) return 0;

  const { error } = await supabase.storage.from(bucket).remove(paths);
  if (error) {
    // Report rather than throw: leaving the database row would strand the run
    // in the UI, and the objects can be swept later.
    report.storageErrors.push(`${bucket}: ${error.message}`);
    logger.error({ err: error.message, bucket, runId }, "failed to remove objects");
    return 0;
  }
  return paths.length;
}

async function listPathsRecursive(
  bucket: string,
  prefix: string,
  report: DeletionReport,
  depth = 0
): Promise<string[]> {
  // Guard against an unexpectedly deep tree pinning the request open.
  if (depth > 3) return [];

  const { data, error } = await supabase.storage.from(bucket).list(prefix, {
    limit: 1000,
  });
  if (error) {
    report.storageErrors.push(`${bucket}: ${error.message}`);
    return [];
  }

  const paths: string[] = [];
  for (const entry of data ?? []) {
    const path = `${prefix}/${entry.name}`;
    // Storage marks folders by returning no id/metadata for the entry.
    if (entry.id === null) {
      paths.push(...(await listPathsRecursive(bucket, path, report, depth + 1)));
    } else {
      paths.push(path);
    }
  }
  return paths;
}
