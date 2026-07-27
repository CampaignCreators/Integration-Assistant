"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { RunEventRow, RunStatus } from "@cc/shared";
import { createClient } from "@/lib/supabase/client";

/** Plain-language names for the pipeline steps (spec §9: no API jargon). */
const STEP_LABELS: Record<string, string> = {
  intake: "Your answers received",
  pipeline: "Overall progress",
  extract_signals: "Reading your files",
  research_hubspot: "Researching HubSpot",
  research_target: "Researching the other software",
  check_marketplace: "Checking for a ready-made integration",
  assess_middleware: "Checking Make and Zapier",
};

const IN_PROGRESS: RunStatus[] = ["queued", "extracting", "researching", "generating"];

/**
 * Live pipeline progress. Subscribes to `run_events` via Realtime and falls
 * back to polling, so the rep sees movement even if the socket cannot connect.
 */
export function ProcessingView({
  runId,
  status,
  initialEvents,
}: {
  runId: string;
  status: RunStatus;
  initialEvents: RunEventRow[];
}) {
  const router = useRouter();
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`run-${runId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "run_events",
          filter: `run_id=eq.${runId}`,
        },
        (payload) => {
          setEvents((prev) => [...prev, payload.new as RunEventRow]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "runs",
          filter: `id=eq.${runId}`,
        },
        () => router.refresh()
      )
      .subscribe();

    // Safety net: Realtime may be unavailable, and the run's terminal state is
    // what unlocks the results screen.
    const poll = setInterval(() => router.refresh(), 15_000);

    return () => {
      void supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [runId, router]);

  // One row per step, showing its latest state.
  const steps = new Map<string, RunEventRow>();
  for (const event of events) {
    if (event.step === "pipeline") continue;
    steps.set(event.step, event);
  }
  const narration = events.filter((e) => e.step === "pipeline").at(-1);
  const running = IN_PROGRESS.includes(status);

  return (
    <div className="mt-8">
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-3">
          {running ? (
            <span
              aria-hidden
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent"
            />
          ) : null}
          <h2 className="text-lg font-semibold">
            {running ? "Working on it" : "Progress"}
          </h2>
        </div>
        <p className="mt-1 text-sm text-slate-600">
          {narration?.message ??
            "This usually takes a few minutes. You can close this page and come back."}
        </p>

        <ol className="mt-6 space-y-3">
          {[...steps.entries()].map(([step, event]) => (
            <li key={step} className="flex items-start gap-3 text-sm">
              <StepIcon status={event.status} />
              <div>
                <p className="font-medium">{STEP_LABELS[step] ?? step}</p>
                {event.message ? (
                  <p className="text-xs text-slate-500">{event.message}</p>
                ) : null}
              </div>
            </li>
          ))}
          {steps.size === 0 ? (
            <li className="text-sm text-slate-500">Getting started…</li>
          ) : null}
        </ol>
      </div>
    </div>
  );
}

function StepIcon({ status }: { status: RunEventRow["status"] }) {
  const styles: Record<RunEventRow["status"], string> = {
    started: "bg-blue-100 text-blue-700",
    progress: "bg-blue-100 text-blue-700",
    succeeded: "bg-emerald-100 text-emerald-700",
    failed: "bg-red-100 text-red-700",
    skipped: "bg-slate-100 text-slate-500",
  };
  const glyphs: Record<RunEventRow["status"], string> = {
    started: "…",
    progress: "…",
    succeeded: "✓",
    failed: "!",
    skipped: "–",
  };
  return (
    <span
      aria-hidden
      className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${styles[status]}`}
    >
      {glyphs[status]}
    </span>
  );
}
