import { z } from "zod";
import {
  HUBSPOT_OBJECTS,
  SYNC_DIRECTIONS,
  SYNC_FREQUENCIES,
  VOLUME_BUCKETS,
} from "./types";

/** Body for POST /runs — everything optional so an empty run can be created. */
export const createRunSchema = z.object({
  title: z.string().trim().max(200).optional(),
  target_software: z.string().trim().max(200).optional(),
  direction: z.enum(SYNC_DIRECTIONS).optional(),
  frequency: z.enum(SYNC_FREQUENCIES).optional(),
  description: z.string().trim().max(2000).optional(),
  objects: z.array(z.enum(HUBSPOT_OBJECTS)).optional(),
  trigger_event: z.string().trim().max(500).optional(),
  volume: z.enum(VOLUME_BUCKETS).optional(),
});
export type CreateRunInput = z.infer<typeof createRunSchema>;

export const listRunsQuerySchema = z.object({
  status: z.string().optional(),
});

export const UPLOAD_TYPES_SCHEMA = z.enum(["txt", "md", "docx", "pdf", "vtt", "srt"]);
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB per file
export const MAX_UPLOADS_PER_RUN = 10;

/** Body for POST /runs/:id/upload-url — mint a signed Storage upload URL. */
export const uploadUrlSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  size_bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});
export type UploadUrlInput = z.infer<typeof uploadUrlSchema>;

/** Body for POST /runs/:id/uploads — register uploaded Storage objects. */
export const registerUploadsSchema = z.object({
  uploads: z
    .array(
      z.object({
        storage_path: z.string().trim().min(1),
        filename: z.string().trim().min(1).max(255),
        type: UPLOAD_TYPES_SCHEMA,
        size_bytes: z.number().int().positive().max(MAX_UPLOAD_BYTES),
      })
    )
    .min(1)
    .max(MAX_UPLOADS_PER_RUN),
});
export type RegisterUploadsInput = z.infer<typeof registerUploadsSchema>;

/** Body for PUT /runs/:id/intake — save the guided brief (draft runs only). */
export const intakeSchema = z.object({
  target_software: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
  direction: z.enum(SYNC_DIRECTIONS).optional(),
  frequency: z.enum(SYNC_FREQUENCIES).optional(),
  objects: z.array(z.enum(HUBSPOT_OBJECTS)).optional(),
  trigger_event: z.string().trim().max(500).optional(),
  volume: z.enum(VOLUME_BUCKETS).nullable().optional(),
});
export type IntakeInput = z.infer<typeof intakeSchema>;

/**
 * Body for PATCH /runs/:id/mappings — the complete desired table.
 *
 * Sending the whole list makes the edit idempotent: rows carrying an `id` are
 * updated, rows without one are inserted, and anything missing is removed.
 * Array order becomes the display order.
 */
export const mappingRowInputSchema = z.object({
  id: z.string().uuid().optional(),
  source_obj: z.string().trim().min(1).max(200),
  source_field: z.string().trim().min(1).max(200),
  target_obj: z.string().trim().min(1).max(200),
  target_field: z.string().trim().min(1).max(200),
  direction: z.enum(["one_way", "two_way"]),
  transform: z.string().trim().max(1000).nullable(),
  required: z.boolean(),
  match_key: z.boolean(),
  notes: z.string().trim().max(2000).nullable(),
});
export type MappingRowInput = z.infer<typeof mappingRowInputSchema>;

export const MAX_MAPPING_ROWS = 500;

export const updateMappingsSchema = z.object({
  rows: z.array(mappingRowInputSchema).max(MAX_MAPPING_ROWS),
  match_strategy: z.string().trim().max(4000).optional(),
  gaps: z.array(z.string().trim().max(1000)).max(100).optional(),
});
export type UpdateMappingsInput = z.infer<typeof updateMappingsSchema>;

/** Body for PATCH /admin/users/:id — role changes. */
export const updateUserRoleSchema = z.object({
  role: z.enum(["rep", "reviewer", "admin"]),
});

/** Body for PATCH /admin/settings. */
export const updateSettingsSchema = z.object({
  max_concurrent_runs: z.number().int().min(1).max(20),
});

/** Fields that must be present before a run can be submitted. */
export function validateSubmittable(input: {
  target_software: string | null;
  direction: string | null;
  frequency: string | null;
  objects: string[];
}): string[] {
  const problems: string[] = [];
  if (!input.target_software) problems.push("Tell us which software should connect to HubSpot.");
  if (!input.direction) problems.push("Pick which way data should flow.");
  if (!input.frequency) problems.push("Pick how often it should sync.");
  if (input.objects.length === 0) problems.push("Select at least one type of record to sync.");
  return problems;
}
