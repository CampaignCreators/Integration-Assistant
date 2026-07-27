import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  extractSignalsSchema,
  hubspotSchema,
  mappingsSchema,
  marketplaceSchema,
  middlewareSchema,
  narrativeSchema,
  targetSchema,
} from "./schemas.js";
import { stubStepResult } from "./stub.js";

/**
 * Offline demo data has to satisfy the same schemas as a real response,
 * otherwise the stub drifts and offline runs fail in ways that look like
 * pipeline bugs. It also has to be unmistakably fake, so a document produced
 * offline can never pass for real research.
 */

const STEPS: { tool: string; schema: z.ZodTypeAny }[] = [
  { tool: "submit_signals", schema: extractSignalsSchema },
  { tool: "submit_hubspot_research", schema: hubspotSchema },
  { tool: "submit_target_research", schema: targetSchema },
  { tool: "submit_marketplace_research", schema: marketplaceSchema },
  { tool: "submit_middleware_assessment", schema: middlewareSchema },
  { tool: "submit_narrative", schema: narrativeSchema },
  { tool: "submit_mappings", schema: mappingsSchema },
];

const PROMPT = "Target software: Stripe\nDirection: two-way";

describe("offline demo data", () => {
  it.each(STEPS)("$tool matches the real schema", ({ tool, schema }) => {
    const result = stubStepResult(tool, PROMPT, "claude-opus-5");
    const parsed = schema.safeParse(result.data);
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true);
  });

  it("covers every step the pipeline actually runs", () => {
    // A missing tool would surface as a mid-run crash in offline mode.
    for (const { tool } of STEPS) {
      expect(() => stubStepResult(tool, PROMPT, "claude-opus-5")).not.toThrow();
    }
  });

  it("throws loudly for an unknown step rather than inventing a shape", () => {
    expect(() => stubStepResult("submit_something_new", PROMPT, "claude-opus-5")).toThrow(
      /no canned result/i
    );
  });

  it("marks every research finding as fake in its summary", () => {
    for (const tool of [
      "submit_hubspot_research",
      "submit_target_research",
      "submit_marketplace_research",
      "submit_middleware_assessment",
    ]) {
      const { data } = stubStepResult<{ summary: string }>(
        tool,
        PROMPT,
        "claude-opus-5"
      );
      expect(data.summary).toContain("OFFLINE DEMO DATA");
    }
  });

  it("forces low confidence, so nothing reads as verified", () => {
    for (const tool of [
      "submit_hubspot_research",
      "submit_target_research",
      "submit_marketplace_research",
      "submit_middleware_assessment",
    ]) {
      const { data } = stubStepResult<{ confidence: string }>(
        tool,
        PROMPT,
        "claude-opus-5"
      );
      expect(data.confidence).toBe("low");
    }
  });

  it("states outright in open questions that nothing was researched", () => {
    const { data } = stubStepResult<{ open_questions: string[] }>(
      "submit_target_research",
      PROMPT,
      "claude-opus-5"
    );
    expect(data.open_questions.join(" ")).toMatch(/offline demo mode/i);
    expect(data.open_questions.join(" ")).toMatch(/Nothing here was researched/i);
  });

  it("costs nothing, so demo runs do not pollute the cost report", () => {
    const { usage } = stubStepResult("submit_narrative", PROMPT, "claude-opus-5");
    expect(usage.estimated_cost_usd).toBe(0);
    expect(usage.input_tokens).toBe(0);
    expect(usage.web_search_requests).toBe(0);
  });

  it("names the target software so the demo reads coherently", () => {
    const { data } = stubStepResult<{ summary: string }>(
      "submit_target_research",
      "Target software: ServiceTitan",
      "claude-opus-5"
    );
    expect(data.summary).toContain("ServiceTitan");
  });

  it("falls back to a generic name when the brief named no target", () => {
    const { data } = stubStepResult<{ summary: string }>(
      "submit_target_research",
      "Target software: not specified",
      "claude-opus-5"
    );
    expect(data.summary).toContain("the target system");
  });

  it("leaves one mapping row unresolved so the attention flag can be checked", () => {
    const { data } = stubStepResult<{
      rows: { source_field: string; notes: string | null }[];
    }>("submit_mappings", PROMPT, "claude-opus-5");
    expect(data.rows.some((row) => row.source_field === "UNKNOWN")).toBe(true);
  });

  it("includes a brief conflict so the confirmation step has work to do", () => {
    const { data } = stubStepResult<{
      signals: { conflict_with_brief: boolean }[];
      conflicts: string[];
    }>("submit_signals", PROMPT, "claude-opus-5");
    expect(data.signals.some((s) => s.conflict_with_brief)).toBe(true);
    expect(data.conflicts.length).toBeGreaterThan(0);
  });
});
