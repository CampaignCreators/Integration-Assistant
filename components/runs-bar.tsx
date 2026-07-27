"use client";

import { formatUpdatedAt, type RunSummary } from "@/lib/runs";
import { Button } from "./ui";

/**
 * Saved runs, shown only when Supabase is configured.
 *
 * A flat list rather than a sidebar: an internal tool used by a few people has
 * tens of runs, not thousands, and a dropdown of recent work is all this needs.
 */
export function RunsBar({
  runs,
  currentId,
  saveState,
  busy,
  onOpen,
  onNew,
  onDelete,
  onSignOut,
  email,
}: {
  runs: RunSummary[];
  currentId: string | null;
  saveState: "idle" | "saving" | "saved" | "error";
  busy: boolean;
  onOpen: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onSignOut: () => void;
  email: string | null;
}) {
  const current = runs.find((run) => run.id === currentId) ?? null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
      <label className="flex items-center gap-2">
        <span className="text-slate-600">Run</span>
        <select
          className="max-w-xs rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          value={currentId ?? ""}
          disabled={busy}
          onChange={(event) => {
            if (event.target.value) onOpen(event.target.value);
          }}
        >
          {currentId === null ? <option value="">New run (unsaved)</option> : null}
          {runs.map((run) => (
            <option key={run.id} value={run.id}>
              {run.title}
              {run.confirmed ? " ✓" : ""} · {formatUpdatedAt(run.updated_at)}
            </option>
          ))}
        </select>
      </label>

      <Button variant="secondary" disabled={busy} onClick={onNew}>
        New run
      </Button>

      {current ? (
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (window.confirm(`Delete "${current.title}" and its uploaded files?`)) {
              onDelete(current.id);
            }
          }}
        >
          Delete run
        </Button>
      ) : null}

      <span className="ml-auto flex items-center gap-4 text-xs text-slate-500">
        <SaveState state={saveState} />
        {email ? <span>{email}</span> : null}
        <Button variant="ghost" onClick={onSignOut}>
          Sign out
        </Button>
      </span>
    </div>
  );
}

function SaveState({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "saving") return <span>Saving…</span>;
  if (state === "saved") return <span className="text-emerald-700">Saved</span>;
  if (state === "error") return <span className="text-red-700">Not saved</span>;
  return null;
}
