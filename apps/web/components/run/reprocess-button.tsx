"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Re-runs the research on the files and answers already captured (spec §7
 * `POST /runs/:id/reprocess`). Confirms first, because it discards the current
 * findings, recommendation, and any mapping corrections.
 */
export function ReprocessButton({ runId }: { runId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reprocess() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/runs/${runId}/reprocess`, { method: "POST" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not re-run the research.");
      setBusy(false);
      return;
    }
    setBusy(false);
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm text-slate-600 underline hover:text-slate-900"
        >
          Research this again
        </button>
        {error ? (
          <p className="mt-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-amber-50 p-4">
      <p className="text-sm text-amber-900">
        This researches both systems from scratch using the same files and answers. The
        current findings, recommendation, and any changes you made to the field mapping
        will be replaced. Your uploaded files are kept.
      </p>
      {error ? (
        <p className="mt-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => void reprocess()}
          disabled={busy}
          className="rounded-lg bg-amber-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-60"
        >
          {busy ? "Starting…" : "Yes, research again"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-900 hover:bg-amber-100"
        >
          Keep what I have
        </button>
      </div>
    </div>
  );
}
