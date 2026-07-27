import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it } from "vitest";
import { LlmNoResultError, LlmRefusalError } from "../llm/client.js";
import { PermanentStepError, enforceGrounding, isRetryable } from "./runner.js";

describe("enforceGrounding", () => {
  const finding = {
    summary: "Stripe exposes a documented REST API.",
    sources: [] as string[],
    open_questions: [] as string[],
    confidence: "high",
  };

  it("keeps a cited finding as-is and adds the pages actually visited", () => {
    const result = enforceGrounding(
      { ...finding, sources: ["https://stripe.com/docs/api"] },
      ["https://developers.hubspot.com/docs"]
    );

    expect(result.confidence).toBe("high");
    expect(result.sources).toEqual([
      "https://stripe.com/docs/api",
      "https://developers.hubspot.com/docs",
    ]);
    expect(result.open_questions).toEqual([]);
  });

  it("downgrades an uncited finding to low confidence and an open question", () => {
    const result = enforceGrounding({ ...finding }, []);

    expect(result.confidence).toBe("low");
    expect(result.open_questions).toHaveLength(1);
    expect(result.open_questions[0]).toMatch(/unverified/i);
    // The claim itself survives — it is reframed, not deleted.
    expect(result.summary).toBe(finding.summary);
  });

  it("treats non-URL citations as no citation at all", () => {
    const result = enforceGrounding(
      { ...finding, sources: ["Stripe docs", "the vendor website"] },
      []
    );

    expect(result.confidence).toBe("low");
    expect(result.sources).toEqual([]);
  });

  it("still records visited pages when the model cited nothing", () => {
    const result = enforceGrounding({ ...finding }, ["https://make.com/en/integrations"]);

    expect(result.confidence).toBe("low");
    expect(result.sources).toEqual(["https://make.com/en/integrations"]);
  });

  it("preserves the model's own open questions when downgrading", () => {
    const result = enforceGrounding(
      { ...finding, open_questions: ["Unclear whether webhooks cover deletions."] },
      []
    );

    expect(result.open_questions).toHaveLength(2);
    expect(result.open_questions[1]).toBe("Unclear whether webhooks cover deletions.");
  });

  it("deduplicates and trims sources", () => {
    const result = enforceGrounding(
      { ...finding, sources: [" https://a.com/docs ", "https://a.com/docs"] },
      ["https://a.com/docs"]
    );

    expect(result.sources).toEqual(["https://a.com/docs"]);
  });
});

describe("isRetryable", () => {
  it("does not retry a refusal — the answer will not change", () => {
    expect(isRetryable(new LlmRefusalError("declined", "cyber"))).toBe(false);
  });

  it("does not retry explicit permanent failures", () => {
    expect(isRetryable(new PermanentStepError("brief is incomplete"))).toBe(false);
  });

  it("does not retry client errors that would fail identically", () => {
    const badRequest = new Anthropic.BadRequestError(400, {}, "bad", new Headers());
    expect(isRetryable(badRequest)).toBe(false);
  });

  it("retries a malformed tool payload — often a one-off", () => {
    expect(isRetryable(new LlmNoResultError("no submit call"))).toBe(true);
  });

  it("retries unknown and transient failures", () => {
    expect(isRetryable(new Error("socket hang up"))).toBe(true);
    expect(isRetryable(new Anthropic.InternalServerError(500, {}, "boom", new Headers()))).toBe(
      true
    );
  });
});
