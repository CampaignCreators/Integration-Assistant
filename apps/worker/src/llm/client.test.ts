import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

/**
 * Covers the ways a research turn can end without a usable result. These are
 * the paths that fail silently in production if mishandled: a `pause_turn`
 * that is not resumed looks like a truncated answer, and an `end_turn` with no
 * submit call looks like an empty finding.
 */

const schema = z.object({ verdict: z.string() });

class FakeBadRequestError extends Error {}
class FakeOtherError extends Error {}

interface FakeMessage {
  content: unknown[];
  stop_reason: string;
  stop_details?: { category: string } | null;
  usage: Record<string, unknown>;
}

function usage(overrides: Record<string, unknown> = {}) {
  return {
    input_tokens: 100,
    output_tokens: 50,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    server_tool_use: { web_search_requests: 1, web_fetch_requests: 0 },
    ...overrides,
  };
}

function submitBlock(input: unknown) {
  return { type: "tool_use", name: "submit_test", id: "toolu_1", input };
}

function searchResultBlock(urls: string[]) {
  return {
    type: "web_search_tool_result",
    content: urls.map((url) => ({ type: "web_search_result", url, title: url })),
  };
}

/**
 * Installs a mocked SDK returning the given messages in order, then imports a
 * fresh copy of the client (module-level fallback state must not leak between
 * tests).
 */
async function loadClient(messages: FakeMessage[]) {
  const calls: Record<string, unknown>[] = [];
  let index = 0;

  const stream = vi.fn((params: Record<string, unknown>) => {
    calls.push(params);
    const message = messages[index];
    index += 1;
    if (!message) throw new Error("SDK called more times than the test scripted");
    return {
      finalMessage: async () => {
        if (message instanceof Error) throw message;
        return message;
      },
    };
  });

  vi.doMock("@anthropic-ai/sdk", () => {
    // Must be constructible — the client does `new Anthropic({ apiKey })`.
    class FakeAnthropic {
      beta = { messages: { stream } };
      static BadRequestError = FakeBadRequestError;
      static AuthenticationError = FakeOtherError;
      static PermissionDeniedError = FakeOtherError;
      static NotFoundError = FakeOtherError;
    }
    return { default: FakeAnthropic };
  });

  const mod = await import("./client.js");
  return { mod, stream, calls };
}

const baseOptions = {
  system: "system",
  prompt: "prompt",
  submit: { name: "submit_test", description: "d", input_schema: { type: "object" } },
  schema,
} as never;

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test-key";
});

describe("runStructuredStep", () => {
  it("returns the validated submit-tool payload", async () => {
    const { mod } = await loadClient([
      {
        content: [submitBlock({ verdict: "available" })],
        stop_reason: "tool_use",
        usage: usage(),
      },
    ]);

    const result = await mod.runStructuredStep(baseOptions);

    expect(result.data).toEqual({ verdict: "available" });
    expect(result.usage.input_tokens).toBe(100);
    expect(result.usage.web_search_requests).toBe(1);
    expect(result.usage.estimated_cost_usd).toBeGreaterThan(0);
  });

  it("resumes a paused server-tool turn instead of returning empty", async () => {
    const { mod, stream } = await loadClient([
      {
        content: [searchResultBlock(["https://developers.hubspot.com/a"])],
        stop_reason: "pause_turn",
        usage: usage(),
      },
      {
        content: [submitBlock({ verdict: "available" })],
        stop_reason: "tool_use",
        usage: usage(),
      },
    ]);

    const result = await mod.runStructuredStep(baseOptions);

    expect(stream).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ verdict: "available" });
    // Usage accumulates across the resumed turns, not just the last one.
    expect(result.usage.input_tokens).toBe(200);
    expect(result.usage.web_search_requests).toBe(2);
  });

  it("does not inject a user message when resuming a pause", async () => {
    const { mod, calls } = await loadClient([
      { content: [], stop_reason: "pause_turn", usage: usage() },
      {
        content: [submitBlock({ verdict: "x" })],
        stop_reason: "tool_use",
        usage: usage(),
      },
    ]);

    await mod.runStructuredStep(baseOptions);

    const resumeMessages = calls[1]!.messages as { role: string }[];
    expect(resumeMessages.at(-1)!.role).toBe("assistant");
  });

  it("raises on a refusal and carries the category", async () => {
    const { mod } = await loadClient([
      {
        content: [],
        stop_reason: "refusal",
        stop_details: { category: "cyber" },
        usage: usage(),
      },
    ]);

    await expect(mod.runStructuredStep(baseOptions)).rejects.toMatchObject({
      name: "LlmRefusalError",
      category: "cyber",
    });
  });

  it("nudges once when the model ends its turn without reporting", async () => {
    const { mod, stream, calls } = await loadClient([
      { content: [{ type: "text", text: "Here's what I found..." }], stop_reason: "end_turn", usage: usage() },
      {
        content: [submitBlock({ verdict: "limited" })],
        stop_reason: "tool_use",
        usage: usage(),
      },
    ]);

    const result = await mod.runStructuredStep(baseOptions);

    expect(stream).toHaveBeenCalledTimes(2);
    expect(result.data).toEqual({ verdict: "limited" });
    const nudged = calls[1]!.messages as { role: string; content: unknown }[];
    expect(nudged.at(-1)!.role).toBe("user");
    expect(String(nudged.at(-1)!.content)).toContain("submit_test");
  });

  it("gives up after a single nudge rather than looping", async () => {
    const { mod, stream } = await loadClient([
      { content: [], stop_reason: "end_turn", usage: usage() },
      { content: [], stop_reason: "end_turn", usage: usage() },
    ]);

    await expect(mod.runStructuredStep(baseOptions)).rejects.toMatchObject({
      name: "LlmNoResultError",
    });
    expect(stream).toHaveBeenCalledTimes(2);
  });

  it("rejects a submit payload that fails schema validation", async () => {
    const { mod } = await loadClient([
      {
        content: [submitBlock({ wrong_field: 1 })],
        stop_reason: "tool_use",
        usage: usage(),
      },
    ]);

    await expect(mod.runStructuredStep(baseOptions)).rejects.toMatchObject({
      name: "LlmNoResultError",
    });
  });

  it("collects the URLs the model actually searched", async () => {
    const { mod } = await loadClient([
      {
        content: [
          searchResultBlock([
            "https://developers.hubspot.com/docs/api/crm/contacts",
            "https://developers.hubspot.com/docs/api/crm/contacts",
          ]),
          {
            type: "web_fetch_tool_result",
            content: { type: "web_fetch_result", url: "https://stripe.com/docs/api" },
          },
          submitBlock({ verdict: "available" }),
        ],
        stop_reason: "tool_use",
        usage: usage(),
      },
    ]);

    const result = await mod.runStructuredStep(baseOptions);

    expect(result.visitedSources).toEqual([
      "https://developers.hubspot.com/docs/api/crm/contacts",
      "https://stripe.com/docs/api",
    ]);
  });

  it("degrades once when the account rejects refusal fallbacks", async () => {
    const { mod, stream, calls } = await loadClient([
      new FakeBadRequestError("unsupported beta: fallbacks") as never,
      {
        content: [submitBlock({ verdict: "available" })],
        stop_reason: "tool_use",
        usage: usage(),
      },
    ]);

    const result = await mod.runStructuredStep(baseOptions);

    expect(result.data).toEqual({ verdict: "available" });
    expect(stream).toHaveBeenCalledTimes(2);
    expect(calls[0]).toHaveProperty("fallbacks", "default");
    expect(calls[1]).not.toHaveProperty("fallbacks");
  });

  it("does not swallow unrelated bad requests as a fallback problem", async () => {
    const { mod } = await loadClient([
      new FakeBadRequestError("max_tokens must be greater than 0") as never,
    ]);

    await expect(mod.runStructuredStep(baseOptions)).rejects.toBeInstanceOf(
      FakeBadRequestError
    );
  });
});

describe("harvestSources", () => {
  it("ignores a failed web search whose content is an error object", async () => {
    const { mod } = await loadClient([]);
    const sources = mod.harvestSources([
      {
        type: "web_search_tool_result",
        content: { type: "web_search_tool_result_error", error_code: "max_uses_exceeded" },
      },
    ] as never);
    expect(sources).toEqual([]);
  });
});
