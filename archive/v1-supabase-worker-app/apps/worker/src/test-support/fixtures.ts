import type { BriefRow, FieldMappingRow, RunRow } from "@cc/shared";

/**
 * Row fixtures for tests. Kept in one place so adding a column means updating
 * one factory rather than hunting through every test file.
 */

export function makeRun(overrides: Partial<RunRow> = {}): RunRow {
  return {
    id: "run-1",
    user_id: "user-1",
    title: null,
    target_software: "Stripe",
    direction: "two_way",
    frequency: "near_realtime",
    status: "researching",
    recommended_approach: null,
    confidence: null,
    approach_rationale: null,
    approach_details_json: null,
    mapping_meta_json: null,
    error_message: null,
    heartbeat_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeBrief(overrides: Partial<BriefRow> = {}): BriefRow {
  return {
    id: "brief-1",
    run_id: "run-1",
    objects: ["contacts", "deals"],
    trigger_event: null,
    volume: "1k_10k",
    description: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeMapping(
  overrides: Partial<FieldMappingRow> = {}
): FieldMappingRow {
  return {
    id: "map-1",
    run_id: "run-1",
    source_obj: "Stripe · Customer",
    source_field: "email",
    target_obj: "HubSpot · Contacts",
    target_field: "email",
    direction: "one_way",
    transform: null,
    required: true,
    match_key: true,
    notes: null,
    position: 0,
    edited_by: null,
    edited_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}
