import type Anthropic from "@anthropic-ai/sdk";

/**
 * Research tools available to the agent (spec §8.1).
 *
 * The `_20260209` variants have dynamic filtering built in — code execution
 * runs under the hood, so we deliberately do NOT also declare a
 * `code_execution` tool (a second execution environment confuses the model).
 */

export const WEB_SEARCH_TOOL: Anthropic.Beta.Messages.BetaToolUnion = {
  type: "web_search_20260209",
  name: "web_search",
  max_uses: Number(process.env.WEB_SEARCH_MAX_USES ?? 12),
};

export const WEB_FETCH_TOOL: Anthropic.Beta.Messages.BetaToolUnion = {
  type: "web_fetch_20260209",
  name: "web_fetch",
  max_uses: Number(process.env.WEB_FETCH_MAX_USES ?? 12),
};

export const RESEARCH_TOOLS = [WEB_SEARCH_TOOL, WEB_FETCH_TOOL];

/**
 * Builds the "submit" tool that carries a step's structured result.
 *
 * We use forced tool use rather than `output_config.format` because the model
 * must be free to call web_search/web_fetch first and only then report — a
 * response-format constraint would apply to the very first turn.
 *
 * `strict: true` guarantees the input validates against the schema, which
 * requires `additionalProperties: false` plus an explicit `required` list.
 * Strict schemas do not support length/range constraints, so the schemas in
 * `schemas.ts` avoid them and we re-validate with zod on the way out.
 */
export function submitTool(
  name: string,
  description: string,
  schema: Record<string, unknown>
): Anthropic.Beta.Messages.BetaTool {
  return {
    name,
    description,
    strict: true,
    input_schema: schema as Anthropic.Beta.Messages.BetaTool["input_schema"],
  };
}
