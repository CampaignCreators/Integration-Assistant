import { describe, expect, it } from "vitest";
import { harvestSources, resolveMode } from "./claude";
import { analyzeRequestSchema, documentRequestSchema, mappingTableSchema } from "./schemas";
import { demoMapping } from "./demo";
import { buildAnalyzePrompt } from "./prompt";
import type Anthropic from "@anthropic-ai/sdk";

describe("resolveMode", () => {
  it("goes live when a key is present", () => {
    expect(resolveMode({ ANTHROPIC_API_KEY: "sk-ant-x" })).toBe("live");
  });

  it("falls back to demo locally, so the app is usable before a key exists", () => {
    expect(resolveMode({ NODE_ENV: "development" })).toBe("demo");
    expect(resolveMode({})).toBe("demo");
  });

  it("refuses to silently serve demo output in production", () => {
    expect(resolveMode({ NODE_ENV: "production" })).toBe("misconfigured");
  });

  it("still allows demo in production when it was asked for explicitly", () => {
    expect(
      resolveMode({ NODE_ENV: "production", DEMO_MODE: "true" })
    ).toBe("demo");
  });

  it("prefers a real key over the demo flag", () => {
    expect(
      resolveMode({ ANTHROPIC_API_KEY: "sk-ant-x", DEMO_MODE: "true" })
    ).toBe("live");
  });
});

describe("harvestSources", () => {
  it("collects the URLs actually searched", () => {
    const content = [
      { type: "text", text: "thinking" },
      {
        type: "web_search_tool_result",
        content: [
          { type: "web_search_result", url: "https://a.example/docs" },
          { type: "web_search_result", url: "https://b.example/api" },
        ],
      },
    ] as unknown as Anthropic.Beta.Messages.BetaContentBlock[];
    expect(harvestSources(content)).toEqual(["https://a.example/docs", "https://b.example/api"]);
  });

  it("ignores a failed search rather than throwing", () => {
    const content = [
      { type: "web_search_tool_result", content: { type: "web_search_tool_result_error" } },
    ] as unknown as Anthropic.Beta.Messages.BetaContentBlock[];
    expect(harvestSources(content)).toEqual([]);
  });
});

describe("request validation", () => {
  const base = {
    target_software: "ServiceTitan",
    use_case: "Customers into HubSpot",
    notes: "",
    documents: [],
    answers: [],
    round: 0,
  };

  it("accepts a minimal request", () => {
    expect(analyzeRequestSchema.safeParse(base).success).toBe(true);
  });

  it("insists on the two things the user is actually asked for", () => {
    expect(analyzeRequestSchema.safeParse({ ...base, target_software: "  " }).success).toBe(false);
    expect(analyzeRequestSchema.safeParse({ ...base, use_case: "" }).success).toBe(false);
  });

  it("rejects a document request without a mapping", () => {
    expect(
      documentRequestSchema.safeParse({ ...base, kind: "brief", mapping: null }).success
    ).toBe(false);
  });

  it("accepts a document request carrying a full mapping", () => {
    const result = documentRequestSchema.safeParse({
      ...base,
      kind: "handoff",
      mapping: demoMapping("ServiceTitan"),
    });
    expect(result.success).toBe(true);
  });

  it("validates the demo mapping against the same schema as a real one", () => {
    // Otherwise the demo data could drift and only fail in front of the user.
    expect(mappingTableSchema.safeParse(demoMapping("Stripe")).success).toBe(true);
  });
});

describe("buildAnalyzePrompt", () => {
  const request = analyzeRequestSchema.parse({
    target_software: "ServiceTitan",
    use_case: "Customers into HubSpot",
    notes: "12,000 customers",
    documents: [{ name: "call.txt", text: "Marcus: we retype everything" }],
    answers: [{ question: "Which direction?", answer: "Into HubSpot only" }],
    round: 0,
  });

  it("includes everything the user gave", () => {
    const prompt = buildAnalyzePrompt(request, false);
    expect(prompt).toContain("ServiceTitan");
    expect(prompt).toContain("Customers into HubSpot");
    expect(prompt).toContain("12,000 customers");
    expect(prompt).toContain("Marcus: we retype everything");
    expect(prompt).toContain("Into HubSpot only");
  });

  it("offers the choice of asking questions on the first pass", () => {
    expect(buildAnalyzePrompt(request, false)).toContain("request_more_information");
  });

  it("takes that choice away on the final pass", () => {
    const prompt = buildAnalyzePrompt(request, true);
    expect(prompt).toContain("final round");
    expect(prompt).not.toContain("request_more_information");
  });

  it("truncates a huge transcript instead of sending it whole", () => {
    const huge = analyzeRequestSchema.parse({
      ...request,
      documents: [{ name: "long.txt", text: "x".repeat(80_000) }],
    });
    const prompt = buildAnalyzePrompt(huge, false);
    expect(prompt).toContain("[…truncated]");
    expect(prompt.length).toBeLessThan(70_000);
  });

  it("says so plainly when no files were attached", () => {
    const bare = analyzeRequestSchema.parse({ ...request, documents: [], notes: "" });
    const prompt = buildAnalyzePrompt(bare, false);
    expect(prompt).toContain("(no files provided)");
    expect(prompt).toContain("(none)");
  });
});
