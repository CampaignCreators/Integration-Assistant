import Anthropic from "@anthropic-ai/sdk";
import type { EventStatus } from "@cc/shared";
import { LlmNoResultError, LlmRefusalError, type StepUsage } from "../llm/client.js";
import { logger } from "../lib/logger.js";
import { supabase } from "../lib/supabase.js";

/**
 * Step framework for the research pipeline (spec §7.1, §10 reliability).
 *
 * Every step writes `run_events` rows so the UI can show live progress and so a
 * failure is auditable. Steps are idempotent: a step that already succeeded for
 * a run is skipped on reprocess, and a step that failed is retried with backoff
 * rather than losing the results of the steps before it.
 */

export const RETRYABLE_ATTEMPTS = Number(process.env.STEP_MAX_ATTEMPTS ?? 3);
const BASE_BACKOFF_MS = Number(process.env.STEP_BACKOFF_MS ?? 2000);

export async function logEvent(
  runId: string,
  step: string,
  status: EventStatus,
  message?: string
): Promise<void> {
  const { error } = await supabase
    .from("run_events")
    .insert({ run_id: runId, step, status, message: message ?? null });
  if (error) {
    logger.error({ err: error.message, runId, step }, "failed to write run_event");
  }
}

export async function recordUsage(
  runId: string,
  step: string,
  usage: StepUsage
): Promise<void> {
  const { error } = await supabase.from("usage_events").insert({
    run_id: runId,
    step,
    model: usage.model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    estimated_cost_usd: usage.estimated_cost_usd,
  });
  if (error) {
    logger.error({ err: error.message, runId, step }, "failed to record usage");
  }
}

/** A failure that should not be retried — retrying would fail the same way. */
export class PermanentStepError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermanentStepError";
  }
}

export function isRetryable(err: unknown): boolean {
  if (err instanceof PermanentStepError) return false;
  // A refusal is a decision about the request, not a transient fault.
  if (err instanceof LlmRefusalError) return false;
  if (err instanceof Anthropic.BadRequestError) return false;
  if (err instanceof Anthropic.AuthenticationError) return false;
  if (err instanceof Anthropic.PermissionDeniedError) return false;
  if (err instanceof Anthropic.NotFoundError) return false;
  // A malformed tool payload is often a one-off; let it retry.
  if (err instanceof LlmNoResultError) return true;
  return true;
}

export interface StepContext {
  runId: string;
}

/**
 * Runs one named step with checkpointing, skip-if-done, and bounded retries.
 *
 * `hasResult` lets a step declare it has already been done for this run (by
 * looking for its own persisted output), which is what makes reprocess cheap
 * and makes a partial failure resumable.
 */
export async function runStep<T>(
  ctx: StepContext,
  step: string,
  handlers: {
    hasResult?: () => Promise<T | null>;
    execute: () => Promise<T>;
  }
): Promise<T> {
  if (handlers.hasResult) {
    const existing = await handlers.hasResult();
    if (existing !== null) {
      await logEvent(ctx.runId, step, "skipped", "Already completed for this run");
      return existing;
    }
  }

  await logEvent(ctx.runId, step, "started");

  let lastError: unknown;
  for (let attempt = 1; attempt <= RETRYABLE_ATTEMPTS; attempt += 1) {
    try {
      const result = await handlers.execute();
      await logEvent(ctx.runId, step, "succeeded");
      return result;
    } catch (err) {
      lastError = err;
      const retryable = isRetryable(err);
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        { runId: ctx.runId, step, attempt, retryable, err: message },
        "pipeline step failed"
      );

      if (!retryable || attempt === RETRYABLE_ATTEMPTS) break;

      await logEvent(
        ctx.runId,
        step,
        "progress",
        `Attempt ${attempt} failed (${message}); retrying`
      );
      await sleep(BASE_BACKOFF_MS * 2 ** (attempt - 1));
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  await logEvent(ctx.runId, step, "failed", message);
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Splits a research result's claimed sources into ones we can stand behind and
 * open questions (spec §8.2: uncited claims are surfaced as questions, never
 * as facts).
 */
export function enforceGrounding<
  T extends { sources: string[]; open_questions: string[]; confidence: string },
>(result: T, visitedSources: string[]): T {
  const claimed = result.sources.filter((s) => /^https?:\/\//i.test(s.trim()));
  if (claimed.length > 0) {
    return { ...result, sources: dedupe([...claimed, ...visitedSources]) };
  }
  return {
    ...result,
    sources: dedupe(visitedSources),
    confidence: "low",
    open_questions: [
      "This section could not be tied to a specific public source — treat it as " +
        "unverified and confirm before sending to a client.",
      ...result.open_questions,
    ],
  };
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}
