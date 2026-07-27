import { z } from "zod";

/**
 * The whole app is four steps: describe the integration, let Claude draft a
 * mapping (or ask for what it's missing), edit it, confirm it, download two
 * documents. These are the shapes that pass between them.
 */

export const HUBSPOT_OBJECTS = [
  "contacts",
  "companies",
  "deals",
  "tickets",
  "products",
  "line_items",
  "custom",
] as const;

export const HUBSPOT_OBJECT_LABELS: Record<string, string> = {
  contacts: "Contacts",
  companies: "Companies",
  deals: "Deals",
  tickets: "Tickets",
  products: "Products",
  line_items: "Line items",
  custom: "Custom object",
};

export const DIRECTIONS = ["to_hubspot", "to_external", "two_way"] as const;

export const DIRECTION_LABELS: Record<Direction, string> = {
  to_hubspot: "→ HubSpot",
  to_external: "→ other system",
  two_way: "Two-way",
};

export type Direction = (typeof DIRECTIONS)[number];

export const mappingRowSchema = z.object({
  hubspot_object: z.enum(HUBSPOT_OBJECTS),
  /** Only meaningful when hubspot_object is "custom". */
  hubspot_object_name: z.string().nullable(),
  hubspot_property: z.string(),
  external_object: z.string(),
  external_field: z.string(),
  direction: z.enum(DIRECTIONS),
  is_match_key: z.boolean(),
  required: z.boolean(),
  transform: z.string().nullable(),
  notes: z.string().nullable(),
});

export type MappingRow = z.infer<typeof mappingRowSchema>;

/** One entry per object pair, so the table can be read object by object. */
export const objectPlanSchema = z.object({
  hubspot_object: z.enum(HUBSPOT_OBJECTS),
  hubspot_object_name: z.string().nullable(),
  external_object: z.string(),
  purpose: z.string(),
  match_key: z.string(),
  direction: z.enum(DIRECTIONS),
});

export const mappingTableSchema = z.object({
  summary: z.string(),
  objects: z.array(objectPlanSchema).min(1),
  rows: z.array(mappingRowSchema).min(1),
  assumptions: z.array(z.string()),
  open_questions: z.array(z.string()),
});

export type ObjectPlan = z.infer<typeof objectPlanSchema>;
export type MappingTable = z.infer<typeof mappingTableSchema>;

export const questionSchema = z.object({
  question: z.string(),
  why: z.string(),
  /** Suggested answers, so the common case is a click rather than an essay. */
  suggestions: z.array(z.string()),
});

export const questionsSchema = z.object({
  reason: z.string(),
  questions: z.array(questionSchema).min(1).max(6),
});

export type Question = z.infer<typeof questionSchema>;
export type Questions = z.infer<typeof questionsSchema>;

/** What /api/analyze returns: either a table, or a request for more detail. */
export type AnalyzeResult =
  | { kind: "mapping"; mapping: MappingTable; demo: boolean }
  | { kind: "questions"; questions: Questions; demo: boolean };

export const sourceDocSchema = z.object({
  name: z.string(),
  text: z.string(),
  /** Where the original file was kept, when Supabase Storage is configured. */
  storage_path: z.string().nullable().optional(),
});

export type SourceDoc = z.infer<typeof sourceDocSchema>;

export const analyzeRequestSchema = z.object({
  target_software: z.string().trim().min(1, "Name the software first."),
  use_case: z.string().trim().min(1, "Describe the use case first."),
  notes: z.string(),
  documents: z.array(sourceDocSchema),
  /** Answers to a previous round of questions, oldest first. */
  answers: z.array(z.object({ question: z.string(), answer: z.string() })),
  /** How many times we have already asked. Bounded in the route. */
  round: z.number().int().min(0).max(5),
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

/** Prose for the two deliverables, written once the table is confirmed. */
export const narrativeSchema = z.object({
  integration_title: z.string(),
  business_goal: z.string(),
  scope_summary: z.string(),
  out_of_scope: z.array(z.string()),
  systems_overview: z.string(),
  auth_and_access: z.string(),
  sync_behaviour: z.string(),
  edge_cases: z.array(z.string()),
  error_handling: z.string(),
  testing_checklist: z.array(z.string()),
  risks: z.array(z.string()),
  next_steps: z.array(z.string()),
});

export type Narrative = z.infer<typeof narrativeSchema>;

export const DOCUMENT_KINDS = ["brief", "handoff"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const documentRequestSchema = z.object({
  kind: z.enum(DOCUMENT_KINDS),
  target_software: z.string().trim().min(1),
  use_case: z.string().trim().min(1),
  notes: z.string(),
  documents: z.array(sourceDocSchema),
  answers: z.array(z.object({ question: z.string(), answer: z.string() })),
  mapping: mappingTableSchema,
});

export type DocumentRequest = z.infer<typeof documentRequestSchema>;

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_FILES = 10;
export const ACCEPTED_EXTENSIONS = [".txt", ".md", ".vtt", ".srt", ".docx", ".pdf"];

/** A stable label for a row's object, custom names included. */
export function objectLabel(
  object: MappingRow["hubspot_object"],
  name: string | null
): string {
  if (object === "custom") return name?.trim() ? name.trim() : "Custom object";
  return HUBSPOT_OBJECT_LABELS[object] ?? object;
}
