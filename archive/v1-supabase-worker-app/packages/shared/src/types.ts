/**
 * Shared domain types. Row types mirror the Supabase/Postgres schema
 * (snake_case) so payloads pass through the worker API unchanged.
 */

export const USER_ROLES = ["rep", "reviewer", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const RUN_STATUSES = [
  "draft",
  "queued",
  "extracting",
  "awaiting_confirmation",
  "researching",
  "generating",
  "complete",
  "failed",
] as const;
export type RunStatus = (typeof RUN_STATUSES)[number];

export const SYNC_DIRECTIONS = [
  "hubspot_to_target",
  "target_to_hubspot",
  "two_way",
] as const;
export type SyncDirection = (typeof SYNC_DIRECTIONS)[number];

export const SYNC_FREQUENCIES = [
  "realtime",
  "near_realtime",
  "hourly",
  "daily",
  "manual",
] as const;
export type SyncFrequency = (typeof SYNC_FREQUENCIES)[number];

export const VOLUME_BUCKETS = ["lt_1k", "1k_10k", "10k_100k", "gt_100k"] as const;
export type VolumeBucket = (typeof VOLUME_BUCKETS)[number];

export const HUBSPOT_OBJECTS = [
  "contacts",
  "companies",
  "deals",
  "tickets",
  "products",
  "line_items",
  "custom",
] as const;
export type HubSpotObject = (typeof HUBSPOT_OBJECTS)[number];

export const FINDING_SIDES = [
  "hubspot",
  "target",
  "marketplace",
  "middleware",
] as const;
export type FindingSide = (typeof FINDING_SIDES)[number];

export const DELIVERABLE_KINDS = ["requirements_doc", "mapping_sheet"] as const;
export type DeliverableKind = (typeof DELIVERABLE_KINDS)[number];

/** The recommended approaches from the spec §5.4 decision tree. */
export const APPROACHES = [
  "native",
  "native_plus_custom",
  "custom",
  "middleware",
  "not_integrable",
] as const;
export type Approach = (typeof APPROACHES)[number];

export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number];

/** Plain-language names for the approaches, safe to show a rep or a client. */
export const APPROACH_LABELS: Record<Approach, string> = {
  native: "Use the ready-made HubSpot integration",
  native_plus_custom: "Ready-made integration plus a custom piece",
  custom: "Build a custom integration",
  middleware: "Connect it with Make or Zapier",
  not_integrable: "Not connectable as things stand",
};

export const SIGNAL_CATEGORIES = [
  "system",
  "entity",
  "field",
  "pain_point",
  "behavior",
  "edge_case",
  "constraint",
  "other",
] as const;
export type SignalCategory = (typeof SIGNAL_CATEGORIES)[number];

export const EVENT_STATUSES = [
  "started",
  "progress",
  "succeeded",
  "failed",
  "skipped",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const UPLOAD_TYPES = ["txt", "md", "docx", "pdf", "vtt", "srt"] as const;
export type UploadType = (typeof UPLOAD_TYPES)[number];

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface RunRow {
  id: string;
  user_id: string;
  title: string | null;
  target_software: string | null;
  direction: SyncDirection | null;
  frequency: SyncFrequency | null;
  status: RunStatus;
  recommended_approach: Approach | null;
  confidence: ConfidenceLevel | null;
  approach_rationale: string | null;
  approach_details_json: ApproachDetails | null;
  mapping_meta_json: MappingMeta | null;
  error_message: string | null;
  /** Last time a worker reported progress; null if never processed. */
  heartbeat_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Run states where a worker should be actively doing something. */
export const WORKING_STATUSES: RunStatus[] = [
  "extracting",
  "researching",
  "generating",
];

export function isWorking(status: RunStatus): boolean {
  return WORKING_STATUSES.includes(status);
}

/** The prose sections of the requirements document. */
export interface Narrative {
  business_goal: string;
  rationale: string;
  assumptions: string[];
  risks: string[];
  dependencies: string[];
  open_questions: string[];
  implementation_notes: string[];
}

/**
 * Why the recommendation came out the way it did (spec §5.4, §8.2), plus the
 * prose written to explain it. Stored whole so regenerating a document does not
 * need to re-run the decision step.
 */
export interface ApproachDetails {
  /** The decision-tree condition that matched, in plain language. */
  basis: string;
  /** Any documented override that was applied on top of the base rule. */
  override_applied: string | null;
  /** What makes this recommendation less than certain. */
  uncertainty_drivers: string[];
  /** Approaches ruled out, and why. */
  alternatives_considered: { approach: Approach; why_not: string }[];
  narrative: Narrative;
}

export interface BriefRow {
  id: string;
  run_id: string;
  objects: string[];
  trigger_event: string | null;
  volume: VolumeBucket | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadRow {
  id: string;
  run_id: string;
  storage_path: string;
  filename: string;
  type: UploadType;
  size_bytes: number | null;
  status: "uploaded" | "extracted" | "failed";
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExtractedSignalRow {
  id: string;
  run_id: string;
  category: SignalCategory;
  value: string;
  source_ref: string | null;
  is_inferred: boolean;
  conflict_with_brief: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResearchFindingRow {
  id: string;
  run_id: string;
  side: FindingSide;
  summary: string;
  details_json: Record<string, unknown>;
  sources: string[];
  confidence: string | null;
  created_at: string;
  updated_at: string;
}

/** Mapping context the requirements document needs when regenerating. */
export interface MappingMeta {
  match_strategy: string;
  gaps: string[];
}

export interface AppSettingsRow {
  id: boolean;
  max_concurrent_runs: number;
  updated_at: string;
}

export interface RunCostSummaryRow {
  run_id: string;
  user_id: string;
  target_software: string | null;
  status: RunStatus;
  recommended_approach: Approach | null;
  created_at: string;
  cost_usd: string;
  input_tokens: number;
  output_tokens: number;
  llm_calls: number;
}

export interface FieldMappingRow {
  id: string;
  run_id: string;
  source_obj: string;
  source_field: string;
  target_obj: string;
  target_field: string;
  direction: "one_way" | "two_way";
  transform: string | null;
  required: boolean;
  match_key: boolean;
  notes: string | null;
  position: number;
  edited_by: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliverableRow {
  id: string;
  run_id: string;
  kind: DeliverableKind;
  storage_path: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface RunEventRow {
  id: string;
  run_id: string;
  step: string;
  status: EventStatus;
  message: string | null;
  ts: string;
}

export interface UsageEventRow {
  id: string;
  run_id: string;
  step: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  created_at: string;
}

/** GET /runs/:id response */
export interface RunDetail {
  run: RunRow;
  brief: BriefRow | null;
  uploads: UploadRow[];
}
