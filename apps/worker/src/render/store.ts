import type { DeliverableKind } from "@cc/shared";
import { supabase } from "../lib/supabase.js";

/**
 * Stores generated deliverables in the private `deliverables` bucket and
 * records a versioned row per file (spec §5.5, §7).
 *
 * Each regeneration writes a new version at its own path rather than
 * overwriting, so a document already sent to a client stays retrievable.
 */

export const DELIVERABLES_BUCKET = "deliverables";

export const CONTENT_TYPES = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
} as const;

export type DeliverableExtension = keyof typeof CONTENT_TYPES;

export async function nextVersion(
  runId: string,
  kind: DeliverableKind
): Promise<number> {
  const { data, error } = await supabase
    .from("deliverables")
    .select("version")
    .eq("run_id", runId)
    .eq("kind", kind)
    .order("version", { ascending: false })
    .limit(1);
  if (error) throw new Error(`Could not determine version: ${error.message}`);
  const latest = data?.[0]?.version ?? 0;
  return latest + 1;
}

export function deliverableFilename(
  targetSoftware: string | null,
  kind: DeliverableKind,
  extension: DeliverableExtension,
  version: number
): string {
  const slug = (targetSoftware ?? "integration")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const base =
    kind === "requirements_doc"
      ? "integration-requirements"
      : "data-mapping-table";
  return `hubspot-${slug || "integration"}-${base}-v${version}.${extension}`;
}

export async function storeDeliverable(args: {
  runId: string;
  kind: DeliverableKind;
  extension: DeliverableExtension;
  version: number;
  targetSoftware: string | null;
  body: Buffer;
}): Promise<{ storagePath: string; filename: string }> {
  const filename = deliverableFilename(
    args.targetSoftware,
    args.kind,
    args.extension,
    args.version
  );
  const storagePath = `${args.runId}/v${args.version}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from(DELIVERABLES_BUCKET)
    .upload(storagePath, args.body, {
      contentType: CONTENT_TYPES[args.extension],
      upsert: true,
    });
  if (uploadError) {
    throw new Error(`Failed to upload ${filename}: ${uploadError.message}`);
  }

  return { storagePath, filename };
}

/** Records the primary file for a deliverable kind at a given version. */
export async function recordDeliverable(args: {
  runId: string;
  kind: DeliverableKind;
  storagePath: string;
  version: number;
}): Promise<void> {
  const { error } = await supabase.from("deliverables").insert({
    run_id: args.runId,
    kind: args.kind,
    storage_path: args.storagePath,
    version: args.version,
  });
  if (error) throw new Error(`Failed to record deliverable: ${error.message}`);
}
