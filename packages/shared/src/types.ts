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
  recommended_approach: string | null;
  confidence: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
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
