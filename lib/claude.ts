import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

export const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5";

/**
 * Whether this instance can call Claude, and what to do when it cannot.
 *
 * Locally, no key means demo mode — placeholder output, loudly labelled, so the
 * app can be used before a key exists. In production that silence would be
 * dangerous: a document that looks researched but is invented is the worst thing
 * this tool could produce, so a deployment without a key refuses instead.
 */
export type Mode = "live" | "demo" | "misconfigured";

export function resolveMode(env: Record<string, string | undefined> = process.env): Mode {
  if (env.ANTHROPIC_API_KEY) return "live";
  if (env.DEMO_MODE === "true") return "demo";
  if (env.NODE_ENV === "production") return "misconfigured";
  return "demo";
}

export const WEB_SEARCH_ENABLED = process.env.ENABLE_WEB_SEARCH !== "false";
const WEB_SEARCH_MAX_USES = Number(process.env.WEB_SEARCH_MAX_USES ?? 6);

/** Server-side tool loops pause periodically; resume this many times. */
const MAX_RESUMES = 6;

let client: Anthropic | null = null;

function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

export class ClaudeError extends Error {}

export interface ToolSpec {
  name: string;
  description: string;
  input_schema: Anthropic.Beta.Messages.BetaTool["input_schema"];
}

export interface ToolCallOptions {
  system: string;
  prompt: string;
  /** The model must end by calling exactly one of these. */
  tools: ToolSpec[];
  /** Force one specific tool rather than letting the model choose. */
  force?: string;
  research?: boolean;
  maxTokens?: number;
}

export interface ToolCallResult {
  tool: string;
  input: unknown;
  /** URLs the model actually consulted, for the documents' source list. */
  sources: string[];
}

/**
 * Runs one Claude turn that has to report its answer by calling one of `tools`,
 * and returns whichever it called.
 *
 * Two things go wrong in practice and are handled here: a `pause_turn` when the
 * search loop hits its cap (resume), and a turn that ends without calling
 * anything (ask once, then give up rather than looping).
 */
export async function runToolCall(options: ToolCallOptions): Promise<ToolCallResult> {
  const wanted = new Set(options.tools.map((t) => t.name));
  const tools: Anthropic.Beta.Messages.BetaToolUnion[] = [...options.tools];

  if (options.research && WEB_SEARCH_ENABLED) {
    tools.unshift({
      type: "web_search_20260209",
      name: "web_search",
      max_uses: WEB_SEARCH_MAX_USES,
    } as Anthropic.Beta.Messages.BetaToolUnion);
  }

  const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    { role: "user", content: options.prompt },
  ];
  const sources: string[] = [];
  let nudged = false;

  for (let turn = 0; turn <= MAX_RESUMES + 1; turn += 1) {
    const stream = anthropic().beta.messages.stream({
      model: DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? 16_000,
      system: options.system,
      messages,
      tools,
      tool_choice: options.force
        ? { type: "tool", name: options.force }
        : { type: "auto" },
      thinking: { type: "adaptive" },
      output_config: { effort: "high" },
      stream: true,
    });
    const message = await stream.finalMessage();

    sources.push(...harvestSources(message.content));

    if (message.stop_reason === "refusal") {
      throw new ClaudeError("Claude declined this request.");
    }

    const call = message.content.find(
      (block): block is Anthropic.Beta.Messages.BetaToolUseBlock =>
        block.type === "tool_use" && wanted.has(block.name)
    );
    if (call) {
      return { tool: call.name, input: call.input, sources: [...new Set(sources)] };
    }

    messages.push({ role: "assistant", content: message.content });

    if (message.stop_reason === "pause_turn") {
      // The search loop hit its cap. Re-send to resume; adding a user message
      // here would break the trailing server_tool_use the API looks for.
      continue;
    }

    if (nudged) {
      throw new ClaudeError(
        `Claude stopped (${message.stop_reason}) without reporting a result.`
      );
    }
    nudged = true;
    messages.push({
      role: "user",
      content:
        `Report your result now by calling one of these tools: ` +
        `${[...wanted].join(", ")}. If something could not be confirmed, say so in ` +
        `the relevant field or list it as an open question rather than guessing.`,
    });
  }

  throw new ClaudeError("Gave up waiting for Claude to report a result.");
}

/** Validates a tool's input, so a malformed payload fails here and not later. */
export function parseToolInput<T>(schema: z.ZodType<T>, input: unknown, tool: string): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new ClaudeError(`${tool} returned unusable data: ${parsed.error.message}`);
  }
  return parsed.data;
}

export function harvestSources(
  content: Anthropic.Beta.Messages.BetaContentBlock[]
): string[] {
  const urls: string[] = [];
  for (const block of content) {
    if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
      for (const result of block.content) {
        if (result.type === "web_search_result" && result.url) urls.push(result.url);
      }
    }
  }
  return urls;
}
