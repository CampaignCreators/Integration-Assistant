import type { ApproachDetails, Narrative, RunRow } from "@cc/shared";
import { describe, expect, it } from "vitest";
import { makeRun } from "../test-support/fixtures.js";
import { existingDecision } from "./processRun.js";

/**
 * Regenerating a document reuses the stored decision and narrative rather than
 * paying for them again. If any part is missing the caller must be told to
 * re-run research, not handed a half-built document.
 */

const narrative: Narrative = {
  business_goal: "Stop re-typing completed jobs by hand.",
  rationale: "No connector covers job completion, so a custom build is needed.",
  assumptions: ["The client is on HubSpot Professional."],
  risks: ["API access may need a paid add-on."],
  dependencies: ["ServiceTitan OAuth credentials."],
  open_questions: ["Which statuses count as complete?"],
  implementation_notes: ["Poll nightly."],
};

const details: ApproachDetails = {
  basis: "No native app exists and both sides expose usable APIs.",
  override_applied: null,
  uncertainty_drivers: ["The API tier was not confirmed."],
  alternatives_considered: [{ approach: "native", why_not: "None exists." }],
  narrative,
};


const run = (overrides: Partial<RunRow> = {}) =>
  makeRun({
    target_software: "ServiceTitan",
    direction: "target_to_hubspot",
    frequency: "daily",
    status: "complete",
    recommended_approach: "custom",
    confidence: "medium",
    approach_rationale: narrative.rationale,
    approach_details_json: details,
    mapping_meta_json: { match_strategy: "Match on email.", gaps: [] },
    ...overrides,
  });

describe("existingDecision", () => {
  it("rebuilds the decision and narrative from a completed run", () => {
    const outcome = existingDecision(run());

    expect(outcome).not.toBeNull();
    expect(outcome!.decision).toEqual({
      approach: "custom",
      basis: details.basis,
      override_applied: null,
      confidence: "medium",
      uncertainty_drivers: details.uncertainty_drivers,
      alternatives_considered: details.alternatives_considered,
    });
    // The whole narrative survives — a regenerated document must not lose its
    // business goal or dependencies.
    expect(outcome!.narrative).toEqual(narrative);
  });

  it("returns null when the run has no recommendation yet", () => {
    expect(existingDecision(run({ recommended_approach: null }))).toBeNull();
    expect(existingDecision(run({ confidence: null }))).toBeNull();
  });

  it("returns null when the stored details are missing", () => {
    expect(existingDecision(run({ approach_details_json: null }))).toBeNull();
  });

  it("returns null when the details predate the stored narrative", () => {
    const legacy = { ...details, narrative: undefined } as unknown as ApproachDetails;
    expect(existingDecision(run({ approach_details_json: legacy }))).toBeNull();
  });

  it("preserves an override that was applied to the decision", () => {
    const outcome = existingDecision(
      run({
        approach_details_json: {
          ...details,
          override_applied: "Depends on the client getting API access.",
        },
      })
    );
    expect(outcome!.decision.override_applied).toBe(
      "Depends on the client getting API access."
    );
  });
});
