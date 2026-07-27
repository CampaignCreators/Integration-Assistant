import { logger } from "../lib/logger.js";
import type { StepResult } from "./client.js";

/**
 * Offline mode: canned research findings so the app can be exercised end to end
 * without an Anthropic API key.
 *
 * This exists to test everything *around* the LLM — auth, uploads, text
 * extraction, storage, RLS, Realtime, the decision tree, document generation,
 * downloads, editing, deletion — none of which need a real model call.
 *
 * The findings below deliberately identify themselves as fake. A document built
 * in offline mode must never be mistakable for real research: the summaries say
 * so, confidence is forced to low, and an open question states it outright. That
 * is worth more than a tidy-looking demo — a fabricated scoping document sent to
 * a client would be far worse than an obviously stubbed one.
 */

const MARKER = "[OFFLINE DEMO DATA — not real research]";

const DEMO_QUESTION =
  "This run was produced in offline demo mode with placeholder findings. Nothing " +
  "here was researched. Re-run it with an Anthropic API key configured before " +
  "relying on any of it.";

const DEMO_SOURCE = "https://example.invalid/offline-demo-mode";

/** Reads the target software back out of the prompt so the demo reads coherently. */
function targetFrom(prompt: string): string {
  const match = /Target software:\s*(.+)/.exec(prompt);
  const name = match?.[1]?.trim();
  return name && name !== "not specified" ? name : "the target system";
}

function usage(model: string) {
  return {
    model,
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
    web_search_requests: 0,
    web_fetch_requests: 0,
    estimated_cost_usd: 0,
  };
}

/**
 * Returns canned data for a step, keyed by its submit tool. Throws for an
 * unknown tool rather than returning something plausible — a silently wrong
 * shape here would look like a real pipeline bug.
 */
export function stubStepResult<T>(
  submitToolName: string,
  prompt: string,
  model: string
): StepResult<T> {
  const target = targetFrom(prompt);
  logger.warn(
    { submitToolName, target },
    "OFFLINE DEMO MODE: returning placeholder findings instead of calling Claude"
  );

  const data = buildData(submitToolName, target);
  return {
    data: data as T,
    visitedSources: [DEMO_SOURCE],
    usage: usage(model),
  };
}

function buildData(submitToolName: string, target: string): unknown {
  switch (submitToolName) {
    case "submit_signals":
      return {
        signals: [
          {
            category: "system",
            value: `${target} ${MARKER}`,
            source_ref: "offline demo mode",
            is_inferred: false,
            conflict_with_brief: false,
          },
          {
            category: "pain_point",
            value: `Staff re-enter data between ${target} and HubSpot by hand ${MARKER}`,
            source_ref: "offline demo mode",
            is_inferred: false,
            conflict_with_brief: false,
          },
          {
            category: "field",
            value: `Customer email address ${MARKER}`,
            source_ref: "offline demo mode",
            is_inferred: false,
            conflict_with_brief: false,
          },
          {
            category: "constraint",
            value: `The transcript suggests two-way sync, but the brief says one way ${MARKER}`,
            source_ref: "offline demo mode",
            is_inferred: true,
            conflict_with_brief: true,
          },
        ],
        conflicts: [
          `${MARKER} A sample conflict, so the confirmation step has something to resolve.`,
        ],
        summary: `${MARKER} Placeholder extraction. No files were actually read.`,
      };

    case "submit_hubspot_research":
      return {
        summary: `${MARKER} Placeholder HubSpot findings.`,
        objects: [
          {
            object: "contacts",
            api_path: "/crm/v3/objects/contacts",
            standard_properties: ["email", "firstname", "lastname", "phone"],
            required_properties: ["email"],
            likely_custom_properties: ["external_system_id"],
            match_keys: ["email"],
          },
          {
            object: "deals",
            api_path: "/crm/v3/objects/deals",
            standard_properties: ["dealname", "amount", "dealstage", "closedate"],
            required_properties: ["dealname"],
            likely_custom_properties: ["external_deal_id"],
            match_keys: ["external_deal_id"],
          },
        ],
        associations: `${MARKER} Placeholder association notes.`,
        auth_model: `${MARKER} Placeholder auth notes.`,
        webhooks_available: true,
        webhook_notes: `${MARKER} Placeholder webhook notes.`,
        rate_limits: `${MARKER} Placeholder rate-limit notes.`,
        open_questions: [DEMO_QUESTION],
        confidence: "low",
        sources: [DEMO_SOURCE],
      };

    case "submit_target_research":
      return {
        summary: `${MARKER} Placeholder findings for ${target}.`,
        api_verdict: "available",
        api_verdict_reason: `${MARKER} Placeholder verdict — nothing was checked.`,
        docs_url: DEMO_SOURCE,
        api_style: "REST",
        auth_model: `${MARKER} Placeholder auth notes.`,
        objects: [
          {
            name: "Customer",
            endpoint: "/v1/customers",
            notable_fields: ["id", "email", "name", "phone"],
            maps_to_hubspot: "contacts",
          },
          {
            name: "Order",
            endpoint: "/v1/orders",
            notable_fields: ["id", "total", "status", "created_at"],
            maps_to_hubspot: "deals",
          },
        ],
        webhooks_available: false,
        webhook_notes: null,
        pagination: `${MARKER} Placeholder pagination notes.`,
        rate_limits: `${MARKER} Placeholder rate-limit notes.`,
        data_model_mismatches: [
          `${MARKER} ${target} stores one name field where HubSpot splits first and last.`,
        ],
        open_questions: [DEMO_QUESTION],
        confidence: "low",
        sources: [DEMO_SOURCE],
      };

    case "submit_marketplace_research":
      return {
        summary: `${MARKER} Placeholder marketplace check — nothing was searched.`,
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
        open_questions: [DEMO_QUESTION],
        confidence: "low",
        sources: [DEMO_SOURCE],
      };

    case "submit_middleware_assessment":
      return {
        summary: `${MARKER} Placeholder middleware assessment.`,
        verdict: "not_applicable",
        make_connector: { exists: false, url: null, supported_actions: [] },
        zapier_connector: { exists: false, url: null, supported_actions: [] },
        cost_notes: null,
        latency_notes: null,
        vendor_action_required: null,
        open_questions: [DEMO_QUESTION],
        confidence: "low",
        sources: [DEMO_SOURCE],
      };

    case "submit_narrative":
      return {
        business_goal: `${MARKER} Placeholder business goal.`,
        rationale: `${MARKER} Placeholder rationale. The recommendation itself was still decided by the real decision tree from these placeholder findings.`,
        assumptions: [`${MARKER} Placeholder assumption.`],
        risks: [`${MARKER} Placeholder risk.`],
        dependencies: [`${MARKER} Placeholder dependency.`],
        open_questions: [DEMO_QUESTION],
        implementation_notes: [`${MARKER} Placeholder implementation note.`],
      };

    case "submit_mappings":
      return {
        rows: [
          {
            source_system: "target",
            source_obj: "Customer",
            source_field: "email",
            target_obj: "contacts",
            target_field: "email",
            direction: "one_way",
            transform: null,
            required: true,
            match_key: true,
            notes: `${MARKER} Placeholder row.`,
          },
          {
            source_system: "target",
            source_obj: "Customer",
            source_field: "name",
            target_obj: "contacts",
            target_field: "firstname",
            direction: "one_way",
            transform: "Split on the first space",
            required: true,
            match_key: false,
            notes: `${MARKER} Placeholder row.`,
          },
          {
            source_system: "target",
            source_obj: "Order",
            source_field: "UNKNOWN",
            target_obj: "deals",
            target_field: "dealstage",
            direction: "one_way",
            transform: null,
            required: true,
            match_key: false,
            notes: `${MARKER} Deliberately unresolved, so the attention flag and highlighting can be checked.`,
          },
        ],
        match_strategy: `${MARKER} Placeholder match strategy.`,
        gaps: [DEMO_QUESTION],
      };

    default:
      throw new Error(
        `Offline demo mode has no canned result for "${submitToolName}". Add one in ` +
          `llm/stub.ts, or unset LLM_OFFLINE_DEMO to use the real API.`
      );
  }
}
