import type { BriefRow, FieldMappingRow, RunRow } from "@cc/shared";
import { logger } from "../../lib/logger.js";
import type {
  HubSpotResult,
  MarketplaceResult,
  MiddlewareResult,
  NarrativeResult,
  TargetResult,
} from "../../llm/schemas.js";
import { renderMappingCsv, renderMappingSheet } from "../../render/mappingSheet.js";
import { renderRequirementsDoc } from "../../render/requirementsDoc.js";
import { nextVersion, recordDeliverable, storeDeliverable } from "../../render/store.js";
import type { Decision } from "../decide.js";

export const GENERATE_STEP = "generate_deliverables";

export interface GenerateInput {
  run: RunRow;
  brief: BriefRow | null;
  decision: Decision;
  narrative: NarrativeResult;
  findings: {
    hubspot: HubSpotResult;
    target: TargetResult;
    marketplace: MarketplaceResult;
    middleware: MiddlewareResult;
  };
  mappings: FieldMappingRow[];
  matchStrategy: string;
  mappingGaps: string[];
}

/**
 * Renders both deliverables and stores them at a fresh version (spec §5.5).
 *
 * The mapping sheet also gets a CSV sibling at the same version; the .xlsx is
 * the row recorded as the deliverable, since that is what the UI links to.
 */
export async function generateDeliverables(input: GenerateInput): Promise<void> {
  const generatedAt = new Date();
  const { run } = input;

  const [docVersion, sheetVersion] = await Promise.all([
    nextVersion(run.id, "requirements_doc"),
    nextVersion(run.id, "mapping_sheet"),
  ]);

  const [docBuffer, sheetBuffer] = await Promise.all([
    renderRequirementsDoc({ ...input, generatedAt }),
    renderMappingSheet({
      run,
      mappings: input.mappings,
      matchStrategy: input.matchStrategy,
      gaps: input.mappingGaps,
      generatedAt,
    }),
  ]);
  const csvBuffer = renderMappingCsv(input.mappings);

  const doc = await storeDeliverable({
    runId: run.id,
    kind: "requirements_doc",
    extension: "docx",
    version: docVersion,
    targetSoftware: run.target_software,
    body: docBuffer,
  });
  await recordDeliverable({
    runId: run.id,
    kind: "requirements_doc",
    storagePath: doc.storagePath,
    version: docVersion,
  });

  const sheet = await storeDeliverable({
    runId: run.id,
    kind: "mapping_sheet",
    extension: "xlsx",
    version: sheetVersion,
    targetSoftware: run.target_software,
    body: sheetBuffer,
  });
  await recordDeliverable({
    runId: run.id,
    kind: "mapping_sheet",
    storagePath: sheet.storagePath,
    version: sheetVersion,
  });

  // The CSV is a convenience copy, not a separately tracked deliverable.
  await storeDeliverable({
    runId: run.id,
    kind: "mapping_sheet",
    extension: "csv",
    version: sheetVersion,
    targetSoftware: run.target_software,
    body: csvBuffer,
  });

  logger.info(
    {
      runId: run.id,
      docVersion,
      sheetVersion,
      mappingRows: input.mappings.length,
    },
    "deliverables generated"
  );
}
