import { describe, expect, it } from "vitest";
import { estimateCostUsd, ratesForModel } from "./pricing.js";

describe("estimateCostUsd", () => {
  it("prices Opus 5 input and output at the published rates", () => {
    // 1M input at $5 + 1M output at $25.
    const cost = estimateCostUsd("claude-opus-5", {
      input_tokens: 1_000_000,
      output_tokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(30, 4);
  });

  it("bills cache reads at a tenth of input and writes at a premium", () => {
    const read = estimateCostUsd("claude-opus-5", {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 1_000_000,
    });
    const write = estimateCostUsd("claude-opus-5", {
      input_tokens: 0,
      output_tokens: 0,
      cache_creation_input_tokens: 1_000_000,
    });

    expect(read).toBeCloseTo(0.5, 4);
    expect(write).toBeCloseTo(6.25, 4);
  });

  it("includes web search requests in the run's cost", () => {
    const withoutSearch = estimateCostUsd("claude-opus-5", {
      input_tokens: 1000,
      output_tokens: 1000,
    });
    const withSearch = estimateCostUsd("claude-opus-5", {
      input_tokens: 1000,
      output_tokens: 1000,
      web_search_requests: 10,
    });

    expect(withSearch).toBeGreaterThan(withoutSearch);
    expect(withSearch - withoutSearch).toBeCloseTo(0.1, 4);
  });

  it("rounds to the 4 decimal places the column stores", () => {
    const cost = estimateCostUsd("claude-opus-5", {
      input_tokens: 7,
      output_tokens: 3,
    });
    expect(cost).toBe(Number(cost.toFixed(4)));
  });

  it("over-reports rather than under-reports an unrecognised model", () => {
    const unknown = ratesForModel("claude-something-new");
    const opus = ratesForModel("claude-opus-5");
    expect(unknown.inputPerMTok).toBeGreaterThanOrEqual(opus.inputPerMTok);
  });

  it("costs nothing for a step that made no calls", () => {
    expect(estimateCostUsd("claude-opus-5", { input_tokens: 0, output_tokens: 0 })).toBe(0);
  });
});
