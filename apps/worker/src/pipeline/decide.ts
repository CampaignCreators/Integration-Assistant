import type { Approach, BriefRow, ConfidenceLevel, RunRow } from "@cc/shared";
import type {
  MarketplaceResult,
  MiddlewareResult,
  TargetResult,
} from "../llm/schemas.js";

/**
 * The spec §5.4 decision tree, implemented as code rather than left to the
 * model. The recommendation is the most consequential output of the whole app,
 * so it must be deterministic, reviewable, and identical for identical
 * findings. The model's only job is to explain the result in prose.
 */

export interface Decision {
  approach: Approach;
  /** The tree row that matched. */
  basis: string;
  /** A documented override applied on top of that row, if any. */
  override_applied: string | null;
  confidence: ConfidenceLevel;
  uncertainty_drivers: string[];
  alternatives_considered: { approach: Approach; why_not: string }[];
}

interface DecisionInputs {
  run: RunRow;
  brief: BriefRow | null;
  target: TargetResult;
  marketplace: MarketplaceResult;
  middleware: MiddlewareResult;
}

const HIGH_VOLUME = new Set(["10k_100k", "gt_100k"]);

export function decideApproach(inputs: DecisionInputs): Decision {
  const { run, brief, target, marketplace, middleware } = inputs;

  const hasBlockingLimitation = marketplace.limitations.some((l) => l.blocking);
  const targetHasApi = target.api_verdict === "available";
  /**
   * A gated or partial API is not the same as no API: the usual real-world case
   * is a vendor selling API access as an add-on. Calling that "not connectable"
   * would be wrong and would cost the client a project that is perfectly
   * buildable once access is bought.
   */
  const targetApiGated = target.api_verdict === "limited";
  const middlewareViable = middleware.verdict === "viable";
  /**
   * Only an explicit "no connector" finding proves middleware cannot bridge the
   * gap. `not_applicable` means middleware was not needed because the target
   * has its own API — it says nothing about connector availability.
   */
  const middlewareRuledOut = middleware.verdict === "not_viable_no_connector";
  const highVolume = brief?.volume ? HIGH_VOLUME.has(brief.volume) : false;
  const needsRealtime = run.frequency === "realtime";

  const alternatives: { approach: Approach; why_not: string }[] = [];
  let approach: Approach;
  let basis: string;
  let override: string | null = null;

  if (marketplace.native_app_exists) {
    if (marketplace.covers_brief && !hasBlockingLimitation) {
      // Row 1: native app covers objects, direction, and frequency.
      approach = "native";
      basis =
        "A native HubSpot marketplace app exists and covers the records, direction, " +
        "and sync frequency you asked for, with no limitations that would block it.";
      alternatives.push({
        approach: "custom",
        why_not:
          "A custom build would cost more to create and maintain without adding " +
          "anything the native app is missing here.",
      });
    } else if (hasBlockingLimitation) {
      // Row 1 override: reviews or docs reveal a blocking limitation.
      const blockers = marketplace.limitations
        .filter((l) => l.blocking)
        .map((l) => l.limitation);
      if (targetHasApi || targetApiGated) {
        approach = "custom";
        basis =
          "A native app exists, but it has limitations that would block this " +
          "integration as described.";
        override =
          `Native was ruled out because: ${blockers.join("; ")}. ` +
          (targetApiGated
            ? "The target software documents an API but gates access to it, so a " +
              "custom build is the route — conditional on the client obtaining that " +
              "access."
            : "Both systems expose usable APIs, so a custom build is the way to get " +
              "what you need.");
        alternatives.push({
          approach: "native",
          why_not: `The native app cannot do what this project needs: ${blockers.join("; ")}.`,
        });
      } else if (middlewareViable) {
        approach = "middleware";
        basis =
          "A native app exists but is blocked by its limitations, and the target " +
          "software has no usable API of its own.";
        override = `Native was ruled out because: ${blockers.join("; ")}.`;
        alternatives.push({
          approach: "custom",
          why_not:
            "A custom build needs an API on the target side, and no usable public " +
            "API was found.",
        });
      } else {
        approach = "not_integrable";
        basis =
          "The native app is blocked by its limitations, the target software has no " +
          "usable API, and no middleware connector can reach it.";
        override = `Native was ruled out because: ${blockers.join("; ")}.`;
      }
    } else {
      // Row 2: native app exists but is limited on fields, direction, or objects.
      const gaps = marketplace.limitations.map((l) => l.limitation);
      const canSupplement = targetHasApi || targetApiGated;
      approach = canSupplement ? "native_plus_custom" : "native";
      basis =
        "A native HubSpot marketplace app exists but does not fully cover what you " +
        "asked for.";
      if (canSupplement) {
        override =
          "The gaps are real but not fatal, so the native app can carry most of the " +
          "sync with a custom piece added for what it misses" +
          (gaps.length > 0 ? `: ${gaps.join("; ")}.` : ".") +
          (targetApiGated
            ? " The custom piece depends on the client obtaining full API access " +
              "from the vendor."
            : "");
        alternatives.push({
          approach: "custom",
          why_not:
            "Replacing the native app entirely would mean rebuilding sync that " +
            "already works, for a larger build and maintenance cost.",
        });
      } else {
        override =
          "The native app has gaps, but the target software exposes no usable API to " +
          "supplement it with, so the native app is the only route available.";
      }
    }
  } else if (targetHasApi) {
    // Row 3: no native app, but both sides have public APIs.
    approach = "custom";
    basis =
      "No native HubSpot marketplace app connects these two systems, and both sides " +
      "expose usable public APIs, so this can be built directly.";
    alternatives.push({
      approach: "native",
      why_not: "No native marketplace app exists for this pairing.",
    });

    // Row 3 override: low volume / non-technical team can use middleware.
    if (middlewareViable && !highVolume && !needsRealtime) {
      approach = "middleware";
      override =
        "At this record volume and sync frequency, Make or Zapier can carry this " +
        "without a custom build, which your team can maintain without a developer.";
      alternatives.push({
        approach: "custom",
        why_not:
          "A custom build is viable and gives full control, but is more than this " +
          "volume and frequency require.",
      });
    } else if (middlewareViable) {
      alternatives.push({
        approach: "middleware",
        why_not: needsRealtime
          ? "Make and Zapier add polling latency that the real-time requirement rules out."
          : "At this record volume, middleware task costs and throughput limits become a problem.",
      });
    }
  } else if (middlewareViable) {
    // Row 4: no native app, no usable API of its own, but middleware supports it.
    approach = "middleware";
    basis =
      "No native app exists and the target software has no usable public API, but it " +
      "is supported by a middleware connector.";
    alternatives.push({
      approach: "custom",
      why_not:
        "A custom build needs an API on the target side; " +
        `${targetApiGated ? "the API found is too limited to build on" : "no public API documentation was found"}.`,
    });

    // Row 4 override: high volume or true real-time means revisit custom.
    if (highVolume || needsRealtime) {
      override =
        (highVolume
          ? "At this record volume, middleware operation costs and throughput limits " +
            "will bite. "
          : "") +
        (needsRealtime
          ? "The real-time requirement is also beyond what middleware polling gives you. "
          : "") +
        "Worth asking the vendor for direct API access so a custom build becomes possible.";
    }
  } else if (targetApiGated) {
    // A gated API is buildable once access is granted — the answer is "custom,
    // conditionally", not "impossible".
    approach = "custom";
    basis =
      "No native app exists, and the target software does document an API — but " +
      "access to it is gated or the documented surface is partial.";
    override =
      "This recommendation depends on the client getting full API access: " +
      `${target.api_verdict_reason} Confirm that access before committing to a build. ` +
      "If it turns out to be unavailable, this becomes a request to the vendor rather " +
      "than a project we can scope.";
    alternatives.push({
      approach: "middleware",
      why_not: middlewareRuledOut
        ? "Neither Make nor Zapier has a connector that can reach this system."
        : "No middleware connector was found that covers what this integration needs.",
    });
  } else if (middlewareRuledOut) {
    // Row 5: no API and no middleware connector — established, not assumed.
    approach = "not_integrable";
    basis =
      "No native app exists, no usable public API was found for the target software, " +
      "and neither Make nor Zapier has a connector that can reach it. Middleware " +
      "cannot bridge a system that exposes nothing to connect to.";
    alternatives.push(
      { approach: "custom", why_not: "There is no API to build against." },
      {
        approach: "middleware",
        why_not:
          "Make and Zapier still need the target system to expose an API or have a " +
          "supported connector; neither exists here.",
      }
    );
  } else {
    // No API found, and middleware was never actually assessed against this
    // system. Report the dead end, but do not present it as settled.
    approach = "not_integrable";
    basis =
      "No native app exists and no usable public API was found for the target " +
      "software, so there is nothing to build against as things stand.";
    override =
      "Middleware was not conclusively assessed for this system, so confirm with " +
      "Make and Zapier directly before telling the client it cannot be done.";
    alternatives.push({
      approach: "custom",
      why_not: "There is no API to build against.",
    });
  }

  const { confidence, drivers } = scoreConfidence({
    inputs,
    approach,
    overrideApplied: override !== null,
  });

  return {
    approach,
    basis,
    override_applied: override,
    confidence,
    uncertainty_drivers: drivers,
    alternatives_considered: alternatives,
  };
}

/**
 * Confidence is driven by how well-sourced the findings that actually mattered
 * for this decision are — not by how sure the model sounds.
 */
function scoreConfidence(args: {
  inputs: DecisionInputs;
  approach: Approach;
  overrideApplied: boolean;
}): { confidence: ConfidenceLevel; drivers: string[] } {
  const { target, marketplace, middleware, brief, run } = args.inputs;
  const drivers: string[] = [];

  // Which findings this particular decision leaned on.
  const relevant: { name: string; confidence: ConfidenceLevel }[] = [
    { name: "the target software's API", confidence: target.confidence },
    { name: "the HubSpot marketplace check", confidence: marketplace.confidence },
  ];
  if (args.approach === "middleware" || middleware.verdict !== "not_applicable") {
    relevant.push({
      name: "the Make/Zapier assessment",
      confidence: middleware.confidence,
    });
  }

  let worst: ConfidenceLevel = "high";
  for (const { name, confidence } of relevant) {
    if (confidence === "low") {
      worst = "low";
      drivers.push(`Research into ${name} could not be fully verified.`);
    } else if (confidence === "medium" && worst === "high") {
      worst = "medium";
      drivers.push(`Some details of ${name} are uncertain.`);
    }
  }

  if (!marketplace.native_app_exists && marketplace.confidence !== "high") {
    drivers.push(
      "We could not conclusively prove no native app exists — absence is harder to " +
        "verify than presence."
    );
    if (worst === "high") worst = "medium";
  }

  if (target.api_verdict === "limited") {
    drivers.push(
      "The target software's API is gated or partial, so what is actually buildable " +
        "needs confirming with the vendor."
    );
    if (worst === "high") worst = "medium";
  }

  if (!brief?.volume) {
    drivers.push(
      "Record volume was not specified, and it affects whether middleware is a " +
        "sensible choice."
    );
    if (worst === "high") worst = "medium";
  }

  if (run.frequency === "realtime" && !target.webhooks_available) {
    drivers.push(
      "You asked for real-time sync, but the target software does not appear to " +
        "offer webhooks — polling may be the only option."
    );
    if (worst === "high") worst = "medium";
  }

  const openQuestions = [
    ...target.open_questions,
    ...marketplace.open_questions,
    ...middleware.open_questions,
  ];
  if (openQuestions.length > 4) {
    drivers.push(
      `${openQuestions.length} details could not be confirmed from public documentation.`
    );
    if (worst === "high") worst = "medium";
  }

  return { confidence: worst, drivers };
}
