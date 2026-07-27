import { APPROACH_LABELS, type BriefRow, type RunRow } from "@cc/shared";
import { runStructuredStep } from "../../llm/client.js";
import { narrativePrompt } from "../../llm/prompts.js";
import {
  narrativeJsonSchema,
  narrativeSchema,
  type HubSpotResult,
  type MarketplaceResult,
  type MiddlewareResult,
  type NarrativeResult,
  type TargetResult,
} from "../../llm/schemas.js";
import { submitTool } from "../../llm/tools.js";
import { supabase } from "../../lib/supabase.js";
import { decideApproach, type Decision } from "../decide.js";
import { recordUsage } from "../runner.js";

export const DECIDE_STEP = "decide_approach";

export interface DecisionOutcome {
  decision: Decision;
  narrative: NarrativeResult;
}

/**
 * Decides the approach (deterministically, in code) and then has the model
 * write the prose that explains it (spec §5.4, §5.5.1).
 */
export async function decideAndNarrate(
  run: RunRow,
  brief: BriefRow | null,
  findings: {
    hubspot: HubSpotResult;
    target: TargetResult;
    marketplace: MarketplaceResult;
    middleware: MiddlewareResult;
  },
  signals: string[]
): Promise<DecisionOutcome> {
  const decision = decideApproach({
    run,
    brief,
    target: findings.target,
    marketplace: findings.marketplace,
    middleware: findings.middleware,
  });

  const { system, prompt } = narrativePrompt(
    run,
    brief,
    {
      approachLabel: APPROACH_LABELS[decision.approach],
      basis: decision.basis,
      override_applied: decision.override_applied,
      confidence: decision.confidence,
      uncertainty_drivers: decision.uncertainty_drivers,
    },
    [findings.hubspot, findings.target, findings.marketplace, findings.middleware],
    signals
  );

  const { data: narrative, usage } = await runStructuredStep({
    system,
    prompt,
    research: false,
    effort: "high",
    maxTokens: 16_000,
    submit: submitTool(
      "submit_narrative",
      "Report the narrative sections of the requirements document.",
      narrativeJsonSchema
    ),
    schema: narrativeSchema,
  });

  await recordUsage(run.id, DECIDE_STEP, usage);

  const { error } = await supabase
    .from("runs")
    .update({
      recommended_approach: decision.approach,
      confidence: decision.confidence,
      approach_rationale: narrative.rationale,
      approach_details_json: {
        basis: decision.basis,
        override_applied: decision.override_applied,
        uncertainty_drivers: decision.uncertainty_drivers,
        alternatives_considered: decision.alternatives_considered,
        narrative,
      },
    })
    .eq("id", run.id);
  if (error) throw new Error(`Failed to save the recommendation: ${error.message}`);

  return { decision, narrative };
}
