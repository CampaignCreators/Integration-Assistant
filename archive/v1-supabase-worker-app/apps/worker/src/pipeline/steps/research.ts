import type { BriefRow, FindingSide, RunRow } from "@cc/shared";
import { runStructuredStep } from "../../llm/client.js";
import {
  hubspotPrompt,
  marketplacePrompt,
  middlewarePrompt,
  targetPrompt,
} from "../../llm/prompts.js";
import {
  hubspotJsonSchema,
  hubspotSchema,
  marketplaceJsonSchema,
  marketplaceSchema,
  middlewareJsonSchema,
  middlewareSchema,
  targetJsonSchema,
  targetSchema,
  type HubSpotResult,
  type MarketplaceResult,
  type MiddlewareResult,
  type TargetResult,
} from "../../llm/schemas.js";
import { submitTool } from "../../llm/tools.js";
import { supabase } from "../../lib/supabase.js";
import { enforceGrounding, recordUsage } from "../runner.js";

/**
 * The four research steps (spec §5.3). Each is a tool-using Claude call with
 * web search + fetch, whose result is persisted to `research_findings` with the
 * sources it cited.
 */

export const HUBSPOT_STEP = "research_hubspot";
export const TARGET_STEP = "research_target";
export const MARKETPLACE_STEP = "check_marketplace";
export const MIDDLEWARE_STEP = "assess_middleware";

async function persist(
  runId: string,
  side: FindingSide,
  result: { summary: string; sources: string[]; confidence: string },
  details: unknown
): Promise<void> {
  // One finding per side per run, so reprocess overwrites rather than stacks.
  await supabase.from("research_findings").delete().eq("run_id", runId).eq("side", side);
  const { error } = await supabase.from("research_findings").insert({
    run_id: runId,
    side,
    summary: result.summary,
    details_json: details as Record<string, unknown>,
    sources: result.sources,
    confidence: result.confidence,
  });
  if (error) throw new Error(`Failed to save ${side} findings: ${error.message}`);
}

export async function findExistingFinding<T>(
  runId: string,
  side: FindingSide
): Promise<T | null> {
  const { data } = await supabase
    .from("research_findings")
    .select("details_json")
    .eq("run_id", runId)
    .eq("side", side)
    .maybeSingle();
  return (data?.details_json as T | undefined) ?? null;
}

export async function researchHubSpot(
  run: RunRow,
  brief: BriefRow | null,
  signals: string[]
): Promise<HubSpotResult> {
  const { system, prompt } = hubspotPrompt(run, brief, signals);
  const { data, visitedSources, usage } = await runStructuredStep({
    system,
    prompt,
    research: true,
    submit: submitTool(
      "submit_hubspot_research",
      "Report what you established about the HubSpot side of this integration.",
      hubspotJsonSchema
    ),
    schema: hubspotSchema,
  });

  await recordUsage(run.id, HUBSPOT_STEP, usage);
  const grounded = enforceGrounding(data, visitedSources);
  await persist(run.id, "hubspot", grounded, grounded);
  return grounded;
}

export async function researchTarget(
  run: RunRow,
  brief: BriefRow | null,
  signals: string[]
): Promise<TargetResult> {
  const { system, prompt } = targetPrompt(run, brief, signals);
  const { data, visitedSources, usage } = await runStructuredStep({
    system,
    prompt,
    research: true,
    submit: submitTool(
      "submit_target_research",
      "Report what you established about the target software's API and webhooks.",
      targetJsonSchema
    ),
    schema: targetSchema,
  });

  await recordUsage(run.id, TARGET_STEP, usage);
  const grounded = enforceGrounding(data, visitedSources);
  await persist(run.id, "target", grounded, grounded);
  return grounded;
}

export async function checkMarketplace(
  run: RunRow,
  brief: BriefRow | null
): Promise<MarketplaceResult> {
  const { system, prompt } = marketplacePrompt(run, brief);
  const { data, visitedSources, usage } = await runStructuredStep({
    system,
    prompt,
    research: true,
    submit: submitTool(
      "submit_marketplace_research",
      "Report whether a native HubSpot marketplace app exists, what users say about " +
        "it, and its limitations.",
      marketplaceJsonSchema
    ),
    schema: marketplaceSchema,
  });

  await recordUsage(run.id, MARKETPLACE_STEP, usage);
  const grounded = enforceGrounding(data, visitedSources);
  await persist(run.id, "marketplace", grounded, grounded);
  return grounded;
}

export async function assessMiddleware(
  run: RunRow,
  brief: BriefRow | null,
  target: TargetResult,
  marketplace: MarketplaceResult
): Promise<MiddlewareResult> {
  const { system, prompt } = middlewarePrompt(run, brief, target, marketplace);
  const { data, visitedSources, usage } = await runStructuredStep({
    system,
    prompt,
    research: true,
    submit: submitTool(
      "submit_middleware_assessment",
      "Report whether Make or Zapier can actually bridge these two systems.",
      middlewareJsonSchema
    ),
    schema: middlewareSchema,
  });

  await recordUsage(run.id, MIDDLEWARE_STEP, usage);
  const grounded = enforceGrounding(data, visitedSources);
  await persist(run.id, "middleware", grounded, grounded);
  return grounded;
}
