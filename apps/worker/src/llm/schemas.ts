import { z } from "zod";
import { SIGNAL_CATEGORIES } from "@cc/shared";

/**
 * Step output contracts. Each step has a hand-written JSON Schema (for
 * `strict: true` tool use) plus a zod validator applied to what comes back.
 *
 * Strict schemas must set `additionalProperties: false` and list every
 * property in `required`, and may not use length/range constraints — so
 * "optional" fields are modelled as nullable instead.
 */

const CONFIDENCE = ["high", "medium", "low"] as const;
export const API_VERDICTS = ["available", "limited", "none_found"] as const;
export const MIDDLEWARE_VERDICTS = [
  "viable",
  "not_viable_no_connector",
  "not_applicable",
] as const;

function obj(properties: Record<string, unknown>) {
  return {
    type: "object",
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

const str = (description: string) => ({ type: "string", description });
const nullableStr = (description: string) => ({
  type: ["string", "null"],
  description: `${description} Use null if not established.`,
});
const strArray = (description: string) => ({
  type: "array",
  items: { type: "string" },
  description,
});
const bool = (description: string) => ({ type: "boolean", description });
const enumOf = (values: readonly string[], description: string) => ({
  type: "string",
  enum: [...values],
  description,
});

/** Shared shape for a cited claim. */
const SOURCES = strArray(
  "Full URLs of the public pages that support this. Required — a claim you " +
    "cannot cite belongs in open_questions instead."
);

// ───────────────────────────────────────────── extract signals (spec §5.2)

export const extractSignalsJsonSchema = obj({
  signals: {
    type: "array",
    description: "Structured signals found in the discovery material.",
    items: obj({
      category: enumOf(
        SIGNAL_CATEGORIES,
        "system = a named piece of software; entity = a record type; field = a " +
          "specific field; pain_point; behavior = something the integration must do; " +
          "edge_case; constraint = compliance, timing, ownership, budget."
      ),
      value: str("The signal itself, in the customer's own terms where possible."),
      source_ref: nullableStr(
        "A short verbatim quote or the filename this came from."
      ),
      is_inferred: bool(
        "True if you concluded this rather than reading it directly. Never " +
          "invent fields or systems that do not appear in the material."
      ),
      conflict_with_brief: bool(
        "True if this contradicts what the rep answered in the guided brief."
      ),
    }),
  },
  conflicts: {
    type: "array",
    description:
      "Plain-language descriptions of disagreements between the brief and the " +
      "discovery material, for the rep to resolve before research runs.",
    items: str("e.g. 'You chose one-way, but the call describes updates flowing both ways.'"),
  },
  summary: str("Two or three sentences a sales rep would recognise as their call."),
});

export const extractSignalsSchema = z.object({
  signals: z.array(
    z.object({
      category: z.enum(SIGNAL_CATEGORIES),
      value: z.string().trim().min(1),
      source_ref: z.string().nullable(),
      is_inferred: z.boolean(),
      conflict_with_brief: z.boolean(),
    })
  ),
  conflicts: z.array(z.string()),
  summary: z.string(),
});
export type ExtractSignalsResult = z.infer<typeof extractSignalsSchema>;

// ───────────────────────────────────────────── HubSpot research (spec §5.3.1)

export const hubspotJsonSchema = obj({
  summary: str("What the HubSpot side of this integration involves, in 3-5 sentences."),
  objects: {
    type: "array",
    description: "One entry per HubSpot object in scope.",
    items: obj({
      object: str("The HubSpot object, e.g. 'contacts', 'deals'."),
      api_path: str("The documented API path, e.g. '/crm/v3/objects/contacts'."),
      standard_properties: strArray(
        "Documented standard property names relevant to this integration."
      ),
      required_properties: strArray("Properties HubSpot requires on create."),
      likely_custom_properties: strArray(
        "Properties this integration will likely need that HubSpot has no standard " +
          "equivalent for."
      ),
      match_keys: strArray(
        "Properties HubSpot uses to deduplicate this object, e.g. email for contacts."
      ),
    }),
  },
  associations: nullableStr("How the objects in scope relate, and the API used."),
  auth_model: str(
    "Private app access token vs OAuth, and which applies here and why."
  ),
  webhooks_available: bool("Whether HubSpot can push changes for these objects."),
  webhook_notes: nullableStr("What webhooks do and do not cover for these objects."),
  rate_limits: str("The documented limits that apply, with the tier they depend on."),
  open_questions: strArray(
    "Anything you could not confirm from public documentation."
  ),
  confidence: enumOf(CONFIDENCE, "Your confidence in this section overall."),
  sources: SOURCES,
});

const hubspotObject = z.object({
  object: z.string(),
  api_path: z.string(),
  standard_properties: z.array(z.string()),
  required_properties: z.array(z.string()),
  likely_custom_properties: z.array(z.string()),
  match_keys: z.array(z.string()),
});

export const hubspotSchema = z.object({
  summary: z.string(),
  objects: z.array(hubspotObject),
  associations: z.string().nullable(),
  auth_model: z.string(),
  webhooks_available: z.boolean(),
  webhook_notes: z.string().nullable(),
  rate_limits: z.string(),
  open_questions: z.array(z.string()),
  confidence: z.enum(CONFIDENCE),
  sources: z.array(z.string()),
});
export type HubSpotResult = z.infer<typeof hubspotSchema>;

// ───────────────────────────────────────────── target research (spec §5.3.2)

export const targetJsonSchema = obj({
  summary: str("What integrating with this software involves, in 3-5 sentences."),
  api_verdict: enumOf(
    API_VERDICTS,
    "available = a usable public REST/GraphQL API is documented; limited = an API " +
      "exists but is gated, partial, or unsuitable; none_found = no public API " +
      "documentation could be located."
  ),
  api_verdict_reason: str("Why you reached that verdict, citing what you saw."),
  docs_url: nullableStr("The canonical public API documentation URL."),
  api_style: nullableStr("REST, GraphQL, SOAP, or other."),
  auth_model: nullableStr("How the API authenticates, e.g. OAuth 2.0, API key."),
  objects: {
    type: "array",
    description: "Documented objects/endpoints relevant to the records in scope.",
    items: obj({
      name: str("The object or endpoint name as the vendor calls it."),
      endpoint: nullableStr("The documented path, if published."),
      notable_fields: strArray("Documented field names relevant to the mapping."),
      maps_to_hubspot: nullableStr(
        "The HubSpot object this most closely corresponds to."
      ),
    }),
  },
  webhooks_available: bool("Whether the software can push changes out."),
  webhook_notes: nullableStr("What its webhooks cover."),
  pagination: nullableStr("How the API paginates."),
  rate_limits: nullableStr("Documented rate limits."),
  data_model_mismatches: strArray(
    "Concrete places its data model does not line up with HubSpot's."
  ),
  open_questions: strArray("Anything you could not confirm publicly."),
  confidence: enumOf(CONFIDENCE, "Your confidence in this section overall."),
  sources: SOURCES,
});

export const targetSchema = z.object({
  summary: z.string(),
  api_verdict: z.enum(API_VERDICTS),
  api_verdict_reason: z.string(),
  docs_url: z.string().nullable(),
  api_style: z.string().nullable(),
  auth_model: z.string().nullable(),
  objects: z.array(
    z.object({
      name: z.string(),
      endpoint: z.string().nullable(),
      notable_fields: z.array(z.string()),
      maps_to_hubspot: z.string().nullable(),
    })
  ),
  webhooks_available: z.boolean(),
  webhook_notes: z.string().nullable(),
  pagination: z.string().nullable(),
  rate_limits: z.string().nullable(),
  data_model_mismatches: z.array(z.string()),
  open_questions: z.array(z.string()),
  confidence: z.enum(CONFIDENCE),
  sources: z.array(z.string()),
});
export type TargetResult = z.infer<typeof targetSchema>;

// ───────────────────────────────────────────── marketplace (spec §5.3.3)

export const marketplaceJsonSchema = obj({
  summary: str("Whether a native integration exists and whether it is good enough."),
  native_app_exists: bool(
    "True only if you found an actual HubSpot App Marketplace listing connecting " +
      "HubSpot and this software."
  ),
  listing_url: nullableStr("The marketplace listing URL."),
  publisher: nullableStr("Who publishes the app — HubSpot or a third party."),
  pricing_model: nullableStr("Free, paid, or tiered, with what is documented."),
  supported_objects: strArray("Objects the listing says it syncs."),
  supported_direction: nullableStr("The sync direction the listing documents."),
  rating: nullableStr("The marketplace rating as published, e.g. '4.2 (58 reviews)'."),
  reviews_summary: nullableStr(
    "What real users report. Summarise only reviews you actually read — never " +
      "invent or paraphrase reviews you did not find."
  ),
  limitations: {
    type: "array",
    description:
      "Specific documented or user-reported limitations that could force a custom " +
      "build — no field-level control, fixed direction, no custom objects, no " +
      "activity sync, and so on.",
    items: obj({
      limitation: str("The limitation, stated plainly."),
      blocking: bool(
        "True if this alone would stop the integration described in the brief."
      ),
      source: nullableStr("Where you saw it."),
    }),
  },
  covers_brief: bool(
    "True if the native app covers the objects, direction, and frequency the rep asked for."
  ),
  open_questions: strArray("Anything you could not confirm."),
  confidence: enumOf(CONFIDENCE, "Your confidence in this section overall."),
  sources: SOURCES,
});

export const marketplaceSchema = z.object({
  summary: z.string(),
  native_app_exists: z.boolean(),
  listing_url: z.string().nullable(),
  publisher: z.string().nullable(),
  pricing_model: z.string().nullable(),
  supported_objects: z.array(z.string()),
  supported_direction: z.string().nullable(),
  rating: z.string().nullable(),
  reviews_summary: z.string().nullable(),
  limitations: z.array(
    z.object({
      limitation: z.string(),
      blocking: z.boolean(),
      source: z.string().nullable(),
    })
  ),
  covers_brief: z.boolean(),
  open_questions: z.array(z.string()),
  confidence: z.enum(CONFIDENCE),
  sources: z.array(z.string()),
});
export type MarketplaceResult = z.infer<typeof marketplaceSchema>;

// ───────────────────────────────────────────── middleware (spec §5.3.4)

export const middlewareJsonSchema = obj({
  summary: str("Whether middleware is a real option here, stated plainly."),
  verdict: enumOf(
    MIDDLEWARE_VERDICTS,
    "viable = Make and/or Zapier has a connector covering what is needed; " +
      "not_viable_no_connector = neither has a usable connector, so no middleware " +
      "can bridge this; not_applicable = the target has a usable API, so middleware " +
      "is a convenience choice rather than a necessity."
  ),
  make_connector: obj({
    exists: bool("Whether Make publishes a connector for this software."),
    url: nullableStr("The connector page URL."),
    supported_actions: strArray("Documented triggers/actions relevant here."),
  }),
  zapier_connector: obj({
    exists: bool("Whether Zapier publishes an app for this software."),
    url: nullableStr("The app page URL."),
    supported_actions: strArray("Documented triggers/actions relevant here."),
  }),
  cost_notes: nullableStr(
    "Task/operation pricing implications at the stated record volume."
  ),
  latency_notes: nullableStr("Polling intervals or latency limits that apply."),
  vendor_action_required: nullableStr(
    "If nothing can bridge this, what the client must ask the vendor for — API " +
      "access, a file/SFTP exchange, or accepting a manual process."
  ),
  open_questions: strArray("Anything you could not confirm."),
  confidence: enumOf(CONFIDENCE, "Your confidence in this section overall."),
  sources: SOURCES,
});

const connector = z.object({
  exists: z.boolean(),
  url: z.string().nullable(),
  supported_actions: z.array(z.string()),
});

export const middlewareSchema = z.object({
  summary: z.string(),
  verdict: z.enum(MIDDLEWARE_VERDICTS),
  make_connector: connector,
  zapier_connector: connector,
  cost_notes: z.string().nullable(),
  latency_notes: z.string().nullable(),
  vendor_action_required: z.string().nullable(),
  open_questions: z.array(z.string()),
  confidence: z.enum(CONFIDENCE),
  sources: z.array(z.string()),
});
export type MiddlewareResult = z.infer<typeof middlewareSchema>;

export type Confidence = (typeof CONFIDENCE)[number];

// ───────────────────────────────────────────── narrative (spec §5.5.1)

/**
 * The prose around the recommendation. The approach itself is decided in code
 * (`pipeline/decide.ts`) and passed in — the model explains it, it does not
 * choose it.
 */
export const narrativeJsonSchema = obj({
  business_goal: str(
    "Two or three sentences on what the client is trying to achieve and why, in " +
      "their language, drawn from the brief and the discovery material."
  ),
  rationale: str(
    "Three to five sentences explaining the recommended approach to a " +
      "non-technical reader. Explain the reasoning given, do not re-decide it."
  ),
  assumptions: strArray(
    "Things taken as true that nobody has confirmed yet."
  ),
  risks: strArray(
    "What could go wrong or cost more than expected, stated concretely."
  ),
  dependencies: strArray(
    "What the client or a third party must provide before work can start."
  ),
  open_questions: strArray(
    "Questions to put to the client or vendor before committing to this scope."
  ),
  implementation_notes: strArray(
    "High-level build notes: authentication, webhooks versus polling, rate-limit " +
      "handling, error and retry behaviour, initial backfill."
  ),
});

export const narrativeSchema = z.object({
  business_goal: z.string(),
  rationale: z.string(),
  assumptions: z.array(z.string()),
  risks: z.array(z.string()),
  dependencies: z.array(z.string()),
  open_questions: z.array(z.string()),
  implementation_notes: z.array(z.string()),
});
export type NarrativeResult = z.infer<typeof narrativeSchema>;

// ───────────────────────────────────────────── field mappings (spec §5.5.2)

export const mappingsJsonSchema = obj({
  rows: {
    type: "array",
    description:
      "One row per field that needs to move. Derive these from the objects in " +
      "scope and the properties established during research — never invent a " +
      "field name that did not appear in the research findings.",
    items: obj({
      source_system: enumOf(
        ["hubspot", "target"],
        "Which system this field originates in."
      ),
      source_obj: str("The originating object, as that system names it."),
      source_field: str(
        "The originating field, as that system names it. If the research did not " +
          "establish a field name, write UNKNOWN and explain in notes."
      ),
      target_obj: str("The destination object, as that system names it."),
      target_field: str(
        "The destination field. If it does not exist yet, name the custom " +
          "property that will need creating and say so in notes."
      ),
      direction: enumOf(
        ["one_way", "two_way"],
        "Whether this specific field syncs one way or both ways. A field can be " +
          "one-way even in a two-way integration."
      ),
      transform: nullableStr(
        "The conversion needed: a type cast, date format change, value/picklist " +
          "mapping, concatenation, or a lookup. Null if the value copies across as-is."
      ),
      required: bool("Whether the destination system requires this field."),
      match_key: bool(
        "Whether this field is used to match existing records so the sync updates " +
          "rather than duplicating."
      ),
      notes: nullableStr(
        "Anything the implementer needs: a custom property to create, a gap, an " +
          "uncertainty, or a judgement call you made."
      ),
    }),
  },
  match_strategy: str(
    "How records will be matched between the systems overall, and what happens " +
      "when no match is found."
  ),
  gaps: strArray(
    "Fields the client asked for that have no home on the other side, and fields " +
      "you could not map because research did not establish them."
  ),
});

export const mappingsSchema = z.object({
  rows: z.array(
    z.object({
      source_system: z.enum(["hubspot", "target"]),
      source_obj: z.string(),
      source_field: z.string(),
      target_obj: z.string(),
      target_field: z.string(),
      direction: z.enum(["one_way", "two_way"]),
      transform: z.string().nullable(),
      required: z.boolean(),
      match_key: z.boolean(),
      notes: z.string().nullable(),
    })
  ),
  match_strategy: z.string(),
  gaps: z.array(z.string()),
});
export type MappingsResult = z.infer<typeof mappingsSchema>;
