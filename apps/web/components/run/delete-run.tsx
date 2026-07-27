"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Deletes a run and everything belonging to it (spec §10 privacy). Discovery
 * transcripts hold client PII, so the copy is explicit that the uploaded files
 * go too — that is the point of the button, not a side effect.
 */
export function DeleteRun({ runId, label }: { runId: string; label: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/runs/${runId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not delete this run.");
      setBusy(false);
      return;
    }
    router.push("/dashboard");
  }

  if (!confirming) {
    return (
      <div className="mt-8 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-sm text-red-700 underline hover:text-red-900"
        >
          Delete this run and its files
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
    <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5">
      <h2 className="font-semibold text-red-900">Delete this run?</h2>
      <p className="mt-1 text-sm text-red-800">
        This permanently removes the run, the transcripts and documents you uploaded,
        the research findings, and the documents we generated. If you have already sent
        those documents to a client, they keep their copies — but you will not be able
        to get them back from here. This cannot be undone.
      </p>

      <label className="mt-4 block">
        <span className="text-sm font-medium text-red-900">
          Type <strong>delete</strong> to confirm
        </span>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          className="mt-1 w-40 rounded-lg border border-red-300 px-3 py-2 text-sm"
          aria-label={`Type delete to confirm removing ${label}`}
        />
      </label>

      {error ? (
        <p className="mt-3 text-sm font-medium text-red-900" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => void remove()}
          disabled={busy || typed.trim().toLowerCase() !== "delete"}
          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Delete permanently"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setTyped("");
            setError(null);
          }}
          disabled={busy}
          className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-900 hover:bg-red-100"
        >
          Keep it
        </button>
      </div>
    </div>
  );
}
