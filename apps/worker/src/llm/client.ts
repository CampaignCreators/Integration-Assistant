import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { logger } from "../lib/logger.js";
import { estimateCostUsd } from "./pricing.js";
import { RESEARCH_TOOLS } from "./tools.js";

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

/** Anthropic recommends enabling refusal fallbacks on Opus 5 / Fable 5. */
const FALLBACKS_BETA = "server-side-fallback-2026-07-01";
const FALLBACKS_ENABLED = process.env.ANTHROPIC_DISABLE_FALLBACKS !== "true";

/** Server-side tool loops pause every 10 iterations; resume this many times. */
const MAX_PAUSE_RESUMES = 8;

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Missing required environment variable: ANTHROPIC_API_KEY");
    client = new Anthropic({ apiKey });
  }
  return client;
}

/** The model declined the request outright (`stop_reason: "refusal"`). */
export class LlmRefusalError extends Error {
  constructor(
    message: string,
    public category: string | null
  ) {
    super(message);
    this.name = "LlmRefusalError";
  }
}

/** The model finished without ever calling the submit tool. */
export class LlmNoResultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LlmNoResultError";
  }
}

export interface StepUsage {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
  web_search_requests: number;
  web_fetch_requests: number;
  estimated_cost_usd: number;
}

export interface StepResult<T> {
  data: T;
  /** URLs the model actually searched or fetched, harvested from tool results. */
  visitedSources: string[];
  usage: StepUsage;
}

export interface RunStepOptions<T> {
  system: string;
  prompt: string;
  submit: Anthropic.Beta.Messages.BetaTool;
  schema: z.ZodType<T>;
  /** Give the agent web search + fetch. Off for pure-reasoning steps. */
  research?: boolean;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
  model?: string;
}

/**
 * Runs one pipeline step as a tool-using Claude call that must report its
 * result by calling the `submit` tool, and returns the validated payload.
 *
 * Handles the three ways a research turn can end without a usable result:
 * a `pause_turn` when the server-side tool loop hits its iteration cap
 * (resumed), a `refusal` (raised), and an `end_turn` with no submit call
 * (nudged once, then raised).
 */
export async function runStructuredStep<T>(
  options: RunStepOptions<T>
): Promise<StepResult<T>> {
  const model = options.model ?? DEFAULT_MODEL;
  // Thinking is on by default on Opus 5 and shares the max_tokens budget with
  // the response, so this needs real headroom or results truncate mid-answer.
  const maxTokens = options.maxTokens ?? 32_000;
  const tools = options.research
    ? [...RESEARCH_TOOLS, options.submit]
    : [options.submit];

  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    { role: "user", content: options.prompt },
  ];

  const totals = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    web_search_requests: 0,
    web_fetch_requests: 0,
  };
  const visited: string[] = [];
  let nudged = false;

  for (let turn = 0; turn <= MAX_PAUSE_RESUMES + 1; turn += 1) {
    const message = await createMessage({
      model,
      maxTokens,
      system: options.system,
      messages,
      tools,
      effort: options.effort ?? "high",
    });

    totals.input_tokens += message.usage.input_tokens;
    totals.output_tokens += message.usage.output_tokens;
    totals.cache_read_input_tokens += message.usage.cache_read_input_tokens ?? 0;
    totals.cache_creation_input_tokens += message.usage.cache_creation_input_tokens ?? 0;
    totals.web_search_requests += message.usage.server_tool_use?.web_search_requests ?? 0;
    totals.web_fetch_requests += message.usage.server_tool_use?.web_fetch_requests ?? 0;
    visited.push(...harvestSources(message.content));

    if (message.stop_reason === "refusal") {
      const details = message.stop_details;
      throw new LlmRefusalError(
        "The model declined this research request.",
        details && "category" in details ? (details.category ?? null) : null
      );
    }

    const submitted = message.content.find(
      (block): block is Anthropic.Beta.Messages.BetaToolUseBlock =>
        block.type === "tool_use" && block.name === options.submit.name
    );
    if (submitted) {
      const parsed = options.schema.safeParse(submitted.input);
      if (!parsed.success) {
        throw new LlmNoResultError(
          `${options.submit.name} returned data that failed validation: ${parsed.error.message}`
        );
      }
      return {
        data: parsed.data,
        visitedSources: dedupe(visited),
        usage: {
          model,
          ...totals,
          estimated_cost_usd: estimateCostUsd(model, totals),
        },
      };
    }

    messages.push({ role: "assistant", content: message.content });

    if (message.stop_reason === "pause_turn") {
      // The server-side tool loop hit its cap. Re-send so it resumes; do NOT
      // add a user message — the API detects the trailing server_tool_use.
      logger.debug({ turn }, "resuming paused research turn");
      continue;
    }

    // Ended (or ran out of tokens) without reporting. Ask once, explicitly.
    if (nudged) {
      throw new LlmNoResultError(
        `The model stopped (${message.stop_reason}) without calling ${options.submit.name}.`
      );
    }
    nudged = true;
    messages.push({
      role: "user",
      content:
        `You have not reported your result yet. Call the ${options.submit.name} tool now ` +
        `with everything you established. If you could not confirm something, say so in ` +
        `the relevant field or list it as an open question rather than guessing.`,
    });
  }

  throw new LlmNoResultError(
    `Gave up after ${MAX_PAUSE_RESUMES} resumes without a ${options.submit.name} call.`
  );
}

interface CreateArgs {
  model: string;
  maxTokens: number;
  system: string;
  messages: Anthropic.Beta.Messages.BetaMessageParam[];
  tools: Anthropic.Beta.Messages.BetaToolUnion[];
  effort: "low" | "medium" | "high" | "xhigh" | "max";
}

/**
 * One streamed request. Streaming keeps long research turns from tripping the
 * SDK's HTTP timeout at these max_tokens values.
 *
 * Refusal fallbacks are a beta; if the account or endpoint rejects them we
 * degrade once and carry on without, rather than failing every research call.
 */
let fallbacksSupported = FALLBACKS_ENABLED;

async function createMessage(
  args: CreateArgs
): Promise<Anthropic.Beta.Messages.BetaMessage> {
  const body: Anthropic.Beta.Messages.MessageCreateParamsStreaming = {
    model: args.model,
    max_tokens: args.maxTokens,
    system: args.system,
    messages: args.messages,
    tools: args.tools,
    tool_choice: { type: "auto" },
    thinking: { type: "adaptive" },
    output_config: { effort: args.effort },
    stream: true,
  };

  const attempt = async (withFallbacks: boolean) => {
    const params = withFallbacks
      ? { ...body, fallbacks: "default" as const, betas: [FALLBACKS_BETA] }
      : body;
    const stream = anthropic().beta.messages.stream(params);
    return stream.finalMessage();
  };

  if (!fallbacksSupported) return attempt(false);

  try {
    return await attempt(true);
  } catch (err) {
    if (err instanceof Anthropic.BadRequestError && /fallback|beta/i.test(err.message)) {
      fallbacksSupported = false;
      logger.warn(
        { err: err.message },
        "refusal fallbacks rejected; continuing without them"
      );
      return attempt(false);
    }
    throw err;
  }
}

/** Pulls the URLs the model actually searched or fetched out of tool results. */
export function harvestSources(
  content: Anthropic.Beta.Messages.BetaContentBlock[]
): string[] {
  const urls: string[] = [];
  for (const block of content) {
    if (block.type === "web_search_tool_result") {
      // `content` is a list on success and an error object on failure.
      if (Array.isArray(block.content)) {
        for (const result of block.content) {
          if (result.type === "web_search_result" && result.url) urls.push(result.url);
        }
      }
    } else if (block.type === "web_fetch_tool_result") {
      const result = block.content;
      if (result && "type" in result && result.type === "web_fetch_result" && result.url) {
        urls.push(result.url);
      }
    }
  }
  return urls;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
