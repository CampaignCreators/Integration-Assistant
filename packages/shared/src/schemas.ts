import { z } from "zod";
import {
  HUBSPOT_OBJECTS,
  SYNC_DIRECTIONS,
  SYNC_FREQUENCIES,
  VOLUME_BUCKETS,
} from "./types.js";

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
