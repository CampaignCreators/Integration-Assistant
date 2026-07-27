import { z } from "zod";
import { mappingTableSchema, questionsSchema, sourceDocSchema } from "./schemas";
import type { Draft } from "./session";

/**
 * Reading and writing saved runs.
 *
 * The row is validated on the way out as well as in: it is jsonb, so a row
 * written by an older version of the app could be any shape, and a bad row should
 * degrade to a usable draft rather than crash the page.
 */

export const runRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  target_software: z.string(),
  use_case: z.string(),
  notes: z.string(),
  documents: z.array(sourceDocSchema),
  answers: z.array(z.object({ question: z.string(), answer: z.string() })),
  questions: questionsSchema.nullable(),
  mapping: mappingTableSchema.nullable(),
  confirmed: z.boolean(),
  round: z.number().int(),
  demo: z.boolean(),
  updated_at: z.string(),
});

export type RunRow = z.infer<typeof runRowSchema>;

export const runSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  target_software: z.string(),
  confirmed: z.boolean(),
  updated_at: z.string(),
});

export type RunSummary = z.infer<typeof runSummarySchema>;

/** A run's display name: whatever the user typed, else the software, else generic. */
export function runTitle(draft: Pick<Draft, "title" | "targetSoftware">): string {
  const title = draft.title?.trim();
  if (title) return title;
  const software = draft.targetSoftware.trim();
  return software ? `${software} → HubSpot` : "Untitled run";
}

/** Draft → the columns to write. */
export function draftToRow(draft: Draft) {
  return {
    title: runTitle(draft),
    target_software: draft.targetSoftware,
    use_case: draft.useCase,
    notes: draft.notes,
    documents: draft.documents,
    answers: draft.answers,
    questions:
      draft.pendingQuestions && draft.questionReason !== null
        ? { reason: draft.questionReason, questions: draft.pendingQuestions }
        : null,
    mapping: draft.mapping,
    confirmed: draft.confirmed,
    round: draft.round,
    demo: draft.demo,
  };
}

/**
 * Row → draft. Anything that fails validation is dropped rather than propagated,
 * so one bad field cannot make a saved run unopenable.
 */
export function rowToDraft(row: unknown): Draft | null {
  const parsed = runRowSchema.safeParse(row);
  if (!parsed.success) return null;
  const data = parsed.data;

  return {
    id: data.id,
    title: data.title,
    targetSoftware: data.target_software,
    useCase: data.use_case,
    notes: data.notes,
    documents: data.documents.map((doc) => ({
      name: doc.name,
      text: doc.text,
      storage_path: doc.storage_path ?? null,
    })),
    answers: data.answers,
    pendingQuestions: data.questions?.questions ?? null,
    questionReason: data.questions?.reason ?? null,
    mapping: data.mapping,
    confirmed: data.confirmed,
    round: data.round,
    demo: data.demo,
  };
}

/** Recovers what is usable from a row that failed validation. */
export function rowToSummary(row: unknown): RunSummary | null {
  const parsed = runSummarySchema.safeParse(row);
  return parsed.success ? parsed.data : null;
}

export function formatUpdatedAt(iso: string, now = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const minutes = Math.round((now.getTime() - then.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return then.toISOString().slice(0, 10);
}
