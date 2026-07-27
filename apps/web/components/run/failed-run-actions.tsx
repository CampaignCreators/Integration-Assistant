"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { RunEventRow } from "@cc/shared";

const STEP_LABELS: Record<string, string> = {
  extract_signals: "reading your files",
  research_hubspot: "researching HubSpot",
  research_target: "researching the other software",
  check_marketplace: "checking for a ready-made integration",
  assess_middleware: "checking Make and Zapier",
  decide_approach: "writing the recommendation",
  build_mappings: "building the field mapping",
  generate_deliverables: "writing the documents",
};

/**
 * What a rep sees when a run fails (spec §10 observability: errors surface in
 * the UI rather than only in the logs).
 *
 * Retry resumes from the failed step and keeps everything that already
 * succeeded, so it is offered first and framed as cheap.
 */
export function FailedRunActions({
  runId,
  errorMessage,
  events,
}: {
  runId: string;
  errorMessage: string | null;
  events: RunEventRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const failedStep = [...events]
    .reverse()
    .find((event) => event.status === "failed" && event.step !== "pipeline");
  const completed = events.filter(
    (event) => event.status === "succeeded" && event.step !== "pipeline"
  ).length;

  async function retry() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/runs/${runId}/retry`, { method: "POST" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not retry this run.");
      setBusy(false);
      return;
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5" role="alert">
      <h2 className="font-semibold text-red-900">This run stopped early</h2>
      <p className="mt-1 text-sm text-red-800">
        {failedStep
          ? `Something went wrong while ${STEP_LABELS[failedStep.step] ?? failedStep.step}.`
          : "Something went wrong before we finished."}
      </p>

      {errorMessage ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-red-900">
            Technical detail
          </summary>
          <p className="mt-2 break-words rounded bg-white/70 p-3 font-mono text-xs text-red-900">
            {errorMessage}
          </p>
        </details>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-900">{error}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void retry()}
          disabled={busy}
          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
        >
          {busy ? "Picking it back up…" : "Try again from where it stopped"}
        </button>
        <span className="text-xs text-red-800">
          {completed > 0
            ? `Keeps the ${completed} step${completed === 1 ? "" : "s"} that already finished.`
            : "Starts over from the beginning."}
        </span>
      </div>
    </div>
  );
}
