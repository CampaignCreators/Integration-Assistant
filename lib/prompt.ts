import type { ToolSpec } from "./claude";
import type { AnalyzeRequest, DocumentRequest } from "./schemas";

/**
 * Prompts and tool definitions.
 *
 * The tool schemas are the contract: Claude reports by calling one, so the
 * shapes here and the zod schemas in schemas.ts have to agree. Anything the
 * model is not sure about belongs in `assumptions` or `open_questions` — never
 * in a mapping row presented as fact.
 */

export const ANALYST_SYSTEM = `You are a HubSpot integration analyst at a marketing agency.

You turn sales-discovery material into a field-level data mapping between HubSpot
and one other system, for a developer to build from.

How to work:
- Cover every object the integration touches, not just the obvious one. If
  contacts sync, ask yourself whether companies, deals, tickets, products or line
  items are implied by the use case, and include them.
- Every object pair needs a match key — the field that decides whether a record
  already exists. Say what it is, even when the answer is imperfect.
- Prefer real HubSpot property names (email, firstname, lastname, dealname,
  amount, dealstage, pipeline, hs_object_id). Where a custom property is needed,
  name it in snake_case and say so in the notes.
- Name real fields and endpoints from the other system when you can establish
  them. If you cannot, say so plainly rather than inventing a plausible field
  name — a wrong field name costs a developer an afternoon.
- Note transformations explicitly: splitting a single name field, mapping a
  status list onto deal stages, currency and timezone handling, unit conversions.

Ask for more information ONLY when the gap would change the shape of the mapping
— an unnamed object, an unknown direction, a missing match key. Do not ask about
things you can reasonably assume and record as an assumption. Never ask more than
you need; three sharp questions beat six vague ones.`;

export const REQUEST_MORE_INFO_TOOL: ToolSpec = {
  name: "request_more_information",
  description:
    "Ask the user for the specific details you need before a mapping can be drafted. Use only when the missing detail would change the mapping's structure.",
  input_schema: {
    type: "object",
    properties: {
      reason: {
        type: "string",
        description: "One sentence on what you cannot determine from what you were given.",
      },
      questions: {
        type: "array",
        minItems: 1,
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            question: { type: "string", description: "Plain language, no API jargon." },
            why: { type: "string", description: "What this changes about the mapping." },
            suggestions: {
              type: "array",
              items: { type: "string" },
              description: "2-4 likely answers the user can pick from.",
            },
          },
          required: ["question", "why", "suggestions"],
        },
      },
    },
    required: ["reason", "questions"],
  },
};

const OBJECT_ENUM = [
  "contacts",
  "companies",
  "deals",
  "tickets",
  "products",
  "line_items",
  "custom",
];

const DIRECTION_ENUM = ["to_hubspot", "to_external", "two_way"];

export const SUBMIT_MAPPING_TOOL: ToolSpec = {
  name: "submit_mapping_table",
  description:
    "Report the recommended data mapping, covering every object the integration touches.",
  input_schema: {
    type: "object",
    properties: {
      summary: {
        type: "string",
        description: "2-4 sentences a non-technical reader can follow.",
      },
      objects: {
        type: "array",
        minItems: 1,
        description: "One entry per object pair in scope.",
        items: {
          type: "object",
          properties: {
            hubspot_object: { type: "string", enum: OBJECT_ENUM },
            hubspot_object_name: {
              type: ["string", "null"],
              description: "Name of the custom object, or null.",
            },
            external_object: { type: "string" },
            purpose: { type: "string", description: "Why this object is in scope." },
            match_key: {
              type: "string",
              description: "How a record is matched between the systems.",
            },
            direction: { type: "string", enum: DIRECTION_ENUM },
          },
          required: [
            "hubspot_object",
            "hubspot_object_name",
            "external_object",
            "purpose",
            "match_key",
            "direction",
          ],
        },
      },
      rows: {
        type: "array",
        minItems: 1,
        description: "Field-level mapping. Every object above needs rows here.",
        items: {
          type: "object",
          properties: {
            hubspot_object: { type: "string", enum: OBJECT_ENUM },
            hubspot_object_name: { type: ["string", "null"] },
            hubspot_property: { type: "string" },
            external_object: { type: "string" },
            external_field: {
              type: "string",
              description: "Use UNKNOWN if you could not establish the real field name.",
            },
            direction: { type: "string", enum: DIRECTION_ENUM },
            is_match_key: { type: "boolean" },
            required: { type: "boolean" },
            transform: {
              type: ["string", "null"],
              description: "Any conversion needed, or null for a straight copy.",
            },
            notes: { type: ["string", "null"] },
          },
          required: [
            "hubspot_object",
            "hubspot_object_name",
            "hubspot_property",
            "external_object",
            "external_field",
            "direction",
            "is_match_key",
            "required",
            "transform",
            "notes",
          ],
        },
      },
      assumptions: {
        type: "array",
        items: { type: "string" },
        description: "What you assumed because it was not stated. Be specific.",
      },
      open_questions: {
        type: "array",
        items: { type: "string" },
        description: "What still needs an answer from the client or their vendor.",
      },
    },
    required: ["summary", "objects", "rows", "assumptions", "open_questions"],
  },
};

export const SUBMIT_NARRATIVE_TOOL: ToolSpec = {
  name: "submit_narrative",
  description:
    "Write the prose for the integration brief and the developer handoff document, based on the confirmed mapping.",
  input_schema: {
    type: "object",
    properties: {
      integration_title: { type: "string", description: 'e.g. "ServiceTitan → HubSpot"' },
      business_goal: { type: "string", description: "What the client gets. No jargon." },
      scope_summary: { type: "string" },
      out_of_scope: { type: "array", items: { type: "string" } },
      systems_overview: {
        type: "string",
        description: "Both systems, their APIs, and how data will move.",
      },
      auth_and_access: {
        type: "string",
        description: "Auth model each side, and what access the client must provide.",
      },
      sync_behaviour: {
        type: "string",
        description: "Trigger, frequency, batching, and how conflicts resolve.",
      },
      edge_cases: { type: "array", items: { type: "string" } },
      error_handling: { type: "string" },
      testing_checklist: { type: "array", items: { type: "string" } },
      risks: { type: "array", items: { type: "string" } },
      next_steps: { type: "array", items: { type: "string" } },
    },
    required: [
      "integration_title",
      "business_goal",
      "scope_summary",
      "out_of_scope",
      "systems_overview",
      "auth_and_access",
      "sync_behaviour",
      "edge_cases",
      "error_handling",
      "testing_checklist",
      "risks",
      "next_steps",
    ],
  },
};

export const WRITER_SYSTEM = `You are writing two documents for a HubSpot integration project.

The mapping table you are given has been reviewed and confirmed by a human — treat
it as settled. Do not contradict it, and do not quietly widen the scope beyond it.

The brief is for the client: plain language, no endpoint names, focused on what
they get and what they must provide. The handoff is for the developer who builds
it: precise, specific, and honest about what is still unknown.

Where the mapping says a field is UNKNOWN or lists an open question, carry that
forward as work to be done. Never paper over a gap with a confident guess.`;

/** Trims long source material so a big transcript cannot crowd out the brief. */
const PER_DOC_LIMIT = 60_000;

function sourceBlock(documents: { name: string; text: string }[]): string {
  if (documents.length === 0) return "(no files provided)";
  return documents
    .map((doc) => {
      const text =
        doc.text.length > PER_DOC_LIMIT
          ? `${doc.text.slice(0, PER_DOC_LIMIT)}\n[…truncated]`
          : doc.text;
      return `--- FILE: ${doc.name} ---\n${text}`;
    })
    .join("\n\n");
}

function answerBlock(answers: { question: string; answer: string }[]): string {
  if (answers.length === 0) return "";
  return `\n\nANSWERS THE USER HAS ALREADY GIVEN\n${answers
    .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
    .join("\n\n")}`;
}

export function buildAnalyzePrompt(request: AnalyzeRequest, finalRound: boolean): string {
  const closing = finalRound
    ? `\n\nThis is the final round: the user has already answered your questions. ` +
      `Produce the mapping table now. Record anything still uncertain as an ` +
      `assumption or an open question.`
    : `\n\nIf you have what you need, call submit_mapping_table. If a genuine gap ` +
      `would change the mapping's structure, call request_more_information instead.`;

  return `SOFTWARE TO INTEGRATE WITH HUBSPOT
${request.target_software}

USE CASE, IN THE USER'S WORDS
${request.use_case}

ADDITIONAL NOTES PASTED BY THE USER
${request.notes.trim() || "(none)"}

SUPPORTING MATERIAL
${sourceBlock(request.documents)}${answerBlock(request.answers)}${closing}`;
}

export function buildNarrativePrompt(request: DocumentRequest): string {
  const rows = request.mapping.rows
    .map(
      (row) =>
        `- [${row.hubspot_object}] ${row.external_object}.${row.external_field} ` +
        `→ HubSpot ${row.hubspot_property} (${row.direction}` +
        `${row.is_match_key ? ", match key" : ""}${row.required ? ", required" : ""})` +
        `${row.transform ? ` transform: ${row.transform}` : ""}` +
        `${row.notes ? ` note: ${row.notes}` : ""}`
    )
    .join("\n");

  return `SOFTWARE
${request.target_software}

USE CASE, IN THE USER'S WORDS
${request.use_case}

ADDITIONAL NOTES
${request.notes.trim() || "(none)"}

SUPPORTING MATERIAL
${sourceBlock(request.documents)}${answerBlock(request.answers)}

CONFIRMED MAPPING SUMMARY
${request.mapping.summary}

OBJECTS IN SCOPE
${request.mapping.objects
  .map(
    (object) =>
      `- ${object.hubspot_object}${
        object.hubspot_object_name ? ` (${object.hubspot_object_name})` : ""
      } ↔ ${object.external_object} — match on ${object.match_key}, ${object.direction}. ${object.purpose}`
  )
  .join("\n")}

CONFIRMED FIELD MAPPING
${rows}

ASSUMPTIONS ALREADY RECORDED
${request.mapping.assumptions.map((a) => `- ${a}`).join("\n") || "(none)"}

OPEN QUESTIONS ALREADY RECORDED
${request.mapping.open_questions.map((q) => `- ${q}`).join("\n") || "(none)"}

Write the prose for both documents by calling submit_narrative.`;
}
