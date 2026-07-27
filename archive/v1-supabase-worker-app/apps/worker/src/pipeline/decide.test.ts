import type { BriefRow, RunRow } from "@cc/shared";
import { describe, expect, it } from "vitest";
import type {
  MarketplaceResult,
  MiddlewareResult,
  TargetResult,
} from "../llm/schemas.js";
import { makeBrief, makeRun } from "../test-support/fixtures.js";
import { decideApproach } from "./decide.js";

/**
 * Every row of the spec §5.4 decision table, plus each documented override.
 * This is the app's most consequential logic — a wrong recommendation is worse
 * than no recommendation, because it will be believed.
 */

const run = makeRun;
const brief = makeBrief;

function target(overrides: Partial<TargetResult> = {}): TargetResult {
  return {
    summary: "s",
    api_verdict: "available",
    api_verdict_reason: "Documented REST API",
    docs_url: "https://stripe.com/docs/api",
    api_style: "REST",
    auth_model: "API key",
    objects: [],
    webhooks_available: true,
    webhook_notes: null,
    pagination: null,
    rate_limits: null,
    data_model_mismatches: [],
    open_questions: [],
    confidence: "high",
    sources: ["https://stripe.com/docs/api"],
    ...overrides,
  };
}

function marketplace(overrides: Partial<MarketplaceResult> = {}): MarketplaceResult {
  return {
    summary: "s",
    native_app_exists: false,
    listing_url: null,
    publisher: null,
    pricing_model: null,
    supported_objects: [],
    supported_direction: null,
    rating: null,
    reviews_summary: null,
    limitations: [],
    covers_brief: false,
    open_questions: [],
    confidence: "high",
    sources: ["https://ecosystem.hubspot.com"],
    ...overrides,
  };
}

function middleware(overrides: Partial<MiddlewareResult> = {}): MiddlewareResult {
  return {
    summary: "s",
    verdict: "not_applicable",
    make_connector: { exists: false, url: null, supported_actions: [] },
    zapier_connector: { exists: false, url: null, supported_actions: [] },
    cost_notes: null,
    latency_notes: null,
    vendor_action_required: null,
    open_questions: [],
    confidence: "high",
    sources: ["https://make.com"],
    ...overrides,
  };
}

function decide(parts: {
  run?: Partial<RunRow>;
  brief?: Partial<BriefRow>;
  target?: Partial<TargetResult>;
  marketplace?: Partial<MarketplaceResult>;
  middleware?: Partial<MiddlewareResult>;
}) {
  return decideApproach({
    run: run(parts.run),
    brief: brief(parts.brief),
    target: target(parts.target),
    marketplace: marketplace(parts.marketplace),
    middleware: middleware(parts.middleware),
  });
}

describe("row 1 — native app covers the brief", () => {
  it("recommends the native app", () => {
    const result = decide({
      marketplace: { native_app_exists: true, covers_brief: true },
    });
    expect(result.approach).toBe("native");
    expect(result.override_applied).toBeNull();
  });

  it("overrides to custom when a review reveals a blocking limitation", () => {
    const result = decide({
      marketplace: {
        native_app_exists: true,
        covers_brief: true,
        limitations: [
          { limitation: "Cannot choose which fields sync", blocking: true, source: null },
        ],
      },
    });
    expect(result.approach).toBe("custom");
    expect(result.override_applied).toContain("Cannot choose which fields sync");
    expect(result.alternatives_considered.map((a) => a.approach)).toContain("native");
  });

  it("falls to middleware when native is blocked and the target has no API", () => {
    const result = decide({
      target: { api_verdict: "none_found" },
      marketplace: {
        native_app_exists: true,
        covers_brief: true,
        limitations: [{ limitation: "One-way only", blocking: true, source: null }],
      },
      middleware: { verdict: "viable" },
    });
    expect(result.approach).toBe("middleware");
  });

  it("is not integrable when native is blocked and nothing else can reach it", () => {
    const result = decide({
      target: { api_verdict: "none_found" },
      marketplace: {
        native_app_exists: true,
        covers_brief: true,
        limitations: [{ limitation: "One-way only", blocking: true, source: null }],
      },
      middleware: { verdict: "not_viable_no_connector" },
    });
    expect(result.approach).toBe("not_integrable");
  });
});

describe("row 2 — native app exists but is limited", () => {
  it("recommends native plus a custom supplement when the target has an API", () => {
    const result = decide({
      marketplace: {
        native_app_exists: true,
        covers_brief: false,
        limitations: [
          { limitation: "No custom object support", blocking: false, source: null },
        ],
      },
    });
    expect(result.approach).toBe("native_plus_custom");
    expect(result.override_applied).toContain("No custom object support");
  });

  it("stays with native when there is no API to supplement it with", () => {
    const result = decide({
      target: { api_verdict: "none_found" },
      marketplace: { native_app_exists: true, covers_brief: false },
    });
    expect(result.approach).toBe("native");
    expect(result.override_applied).toContain("no usable API");
  });
});

describe("row 3 — no native app, both sides have APIs", () => {
  it("recommends a custom build", () => {
    const result = decide({});
    expect(result.approach).toBe("custom");
    expect(result.alternatives_considered.map((a) => a.approach)).toContain("native");
  });

  it("overrides to middleware at low volume when a connector exists", () => {
    const result = decide({
      brief: { volume: "lt_1k" },
      middleware: { verdict: "viable" },
    });
    expect(result.approach).toBe("middleware");
    expect(result.override_applied).toContain("without a custom build");
  });

  it("keeps custom at high volume even when middleware is viable", () => {
    const result = decide({
      brief: { volume: "gt_100k" },
      middleware: { verdict: "viable" },
    });
    expect(result.approach).toBe("custom");
    const ruledOut = result.alternatives_considered.find(
      (a) => a.approach === "middleware"
    );
    expect(ruledOut?.why_not).toMatch(/volume/i);
  });

  it("keeps custom for real-time even at low volume", () => {
    const result = decide({
      run: { frequency: "realtime" },
      brief: { volume: "lt_1k" },
      middleware: { verdict: "viable" },
    });
    expect(result.approach).toBe("custom");
    const ruledOut = result.alternatives_considered.find(
      (a) => a.approach === "middleware"
    );
    expect(ruledOut?.why_not).toMatch(/latency|real-time/i);
  });
});

describe("row 4 — no API but middleware supports it", () => {
  it("recommends middleware", () => {
    const result = decide({
      target: { api_verdict: "none_found" },
      middleware: { verdict: "viable" },
    });
    expect(result.approach).toBe("middleware");
  });

  it("flags revisiting custom at high volume", () => {
    const result = decide({
      target: { api_verdict: "none_found" },
      brief: { volume: "gt_100k" },
      middleware: { verdict: "viable" },
    });
    expect(result.approach).toBe("middleware");
    expect(result.override_applied).toMatch(/API access/i);
  });

  it("flags revisiting custom for real-time", () => {
    const result = decide({
      run: { frequency: "realtime" },
      target: { api_verdict: "none_found" },
      middleware: { verdict: "viable" },
    });
    expect(result.override_applied).toMatch(/real-time/i);
  });

  it("prefers middleware over a gated API when a connector exists", () => {
    const result = decide({
      target: { api_verdict: "limited" },
      middleware: { verdict: "viable" },
    });
    expect(result.approach).toBe("middleware");
    const ruledOut = result.alternatives_considered.find((a) => a.approach === "custom");
    expect(ruledOut?.why_not).toMatch(/too limited/i);
  });
});

/**
 * A gated API is the most common real-world case — vendors sell API access as an
 * add-on. Reporting that as "not connectable" would kill a project that is
 * perfectly buildable once access is purchased.
 */
describe("gated API (verdict: limited)", () => {
  it("recommends a custom build conditional on getting access", () => {
    const result = decide({
      target: {
        api_verdict: "limited",
        api_verdict_reason: "Access is gated behind a paid add-on.",
      },
      middleware: { verdict: "not_applicable" },
    });

    expect(result.approach).toBe("custom");
    expect(result.approach).not.toBe("not_integrable");
    expect(result.override_applied).toMatch(/depends on the client getting full API access/i);
    expect(result.override_applied).toContain("Access is gated behind a paid add-on.");
  });

  it("still supplements a limited native app when the API is gated", () => {
    const result = decide({
      target: { api_verdict: "limited" },
      marketplace: {
        native_app_exists: true,
        covers_brief: false,
        limitations: [{ limitation: "No custom objects", blocking: false, source: null }],
      },
    });
    expect(result.approach).toBe("native_plus_custom");
    expect(result.override_applied).toMatch(/obtaining full API access/i);
  });

  it("routes around a blocked native app rather than giving up", () => {
    const result = decide({
      target: { api_verdict: "limited" },
      marketplace: {
        native_app_exists: true,
        covers_brief: true,
        limitations: [{ limitation: "Fixed sync direction", blocking: true, source: null }],
      },
      middleware: { verdict: "not_applicable" },
    });
    expect(result.approach).toBe("custom");
    expect(result.override_applied).toMatch(/conditional on the client obtaining/i);
  });
});

describe("middleware verdict semantics", () => {
  it("does not read 'not applicable' as proof no connector exists", () => {
    // not_applicable means middleware was not needed, not that it is impossible.
    const result = decide({
      target: { api_verdict: "none_found" },
      middleware: { verdict: "not_applicable" },
    });

    expect(result.approach).toBe("not_integrable");
    expect(result.override_applied).toMatch(/not conclusively assessed/i);
    // The basis must not claim connectors were checked and found missing.
    expect(result.basis).not.toMatch(/neither Make nor Zapier/i);
  });

  it("states the dead end as settled only when connectors were actually ruled out", () => {
    const result = decide({
      target: { api_verdict: "none_found" },
      middleware: { verdict: "not_viable_no_connector" },
    });

    expect(result.approach).toBe("not_integrable");
    expect(result.override_applied).toBeNull();
    expect(result.basis).toMatch(/neither Make nor Zapier/i);
  });
});

describe("row 5 — no API and no connector", () => {
  it("says so plainly rather than recommending middleware anyway", () => {
    const result = decide({
      target: { api_verdict: "none_found" },
      middleware: { verdict: "not_viable_no_connector" },
    });

    expect(result.approach).toBe("not_integrable");
    expect(result.basis).toMatch(/cannot bridge/i);
    // The spec is explicit that middleware must not be offered as a universal
    // fallback — the rejection must be stated, not implied.
    const ruledOut = result.alternatives_considered.find(
      (a) => a.approach === "middleware"
    );
    expect(ruledOut?.why_not).toMatch(/still need/i);
  });
});

describe("confidence scoring", () => {
  it("is high when the findings that mattered are well sourced", () => {
    const result = decide({ marketplace: { native_app_exists: true, covers_brief: true } });
    expect(result.confidence).toBe("high");
    expect(result.uncertainty_drivers).toEqual([]);
  });

  it("drops to low when a decisive finding is unverified", () => {
    const result = decide({ target: { confidence: "low" } });
    expect(result.confidence).toBe("low");
    expect(result.uncertainty_drivers.join(" ")).toMatch(/could not be fully verified/i);
  });

  it("notes that proving no native app exists is harder than proving one does", () => {
    const result = decide({
      marketplace: { native_app_exists: false, confidence: "medium" },
    });
    expect(result.confidence).toBe("medium");
    expect(result.uncertainty_drivers.join(" ")).toMatch(/absence is harder/i);
  });

  it("flags a missing volume answer, since it drives the middleware override", () => {
    const result = decide({ brief: { volume: null } });
    expect(result.uncertainty_drivers.join(" ")).toMatch(/volume was not specified/i);
  });

  it("flags asking for real-time when the target has no webhooks", () => {
    const result = decide({
      run: { frequency: "realtime" },
      target: { webhooks_available: false },
    });
    expect(result.uncertainty_drivers.join(" ")).toMatch(/webhooks/i);
  });

  it("does not let the middleware finding drag down a decision it played no part in", () => {
    const result = decide({
      marketplace: { native_app_exists: true, covers_brief: true },
      middleware: { verdict: "not_applicable", confidence: "low" },
    });
    expect(result.confidence).toBe("high");
  });
});

describe("determinism", () => {
  it("returns the same recommendation for the same findings", () => {
    const inputs = {
      brief: { volume: "lt_1k" as const },
      middleware: { verdict: "viable" as const },
    };
    expect(decide(inputs)).toEqual(decide(inputs));
  });
});
