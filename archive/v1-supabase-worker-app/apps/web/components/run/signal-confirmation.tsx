"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ExtractedSignalRow, SignalCategory } from "@cc/shared";

const CATEGORY_LABELS: Record<SignalCategory, string> = {
  system: "Software mentioned",
  entity: "Records involved",
  field: "Specific fields",
  pain_point: "Problems to solve",
  behavior: "How it should behave",
  edge_case: "Edge cases",
  constraint: "Constraints",
  other: "Other",
};

const ORDER: SignalCategory[] = [
  "system",
  "entity",
  "field",
  "behavior",
  "pain_point",
  "edge_case",
  "constraint",
  "other",
];

/**
 * The rep confirms what we read out of their files before research runs
 * (spec §5.2). Conflicts between the transcript and the brief are surfaced
 * first, because resolving them changes what we research.
 */
export function SignalConfirmation({
  runId,
  signals,
}: {
  runId: string;
  signals: ExtractedSignalRow[];
}) {
  const router = useRouter();
  const [rejected, setRejected] = useState<Set<string>>(new Set());
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const conflicts = signals.filter((s) => s.conflict_with_brief);
  const regular = signals.filter((s) => !s.conflict_with_brief);

  function toggle(set: Set<string>, id: string): Set<string> {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  }

  async function confirm() {
    setSubmitting(true);
    setError(null);
    const response = await fetch(`/api/runs/${runId}/confirm-signals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rejected_signal_ids: [...rejected],
        resolved_conflict_ids: [...resolved],
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not start research.");
      setSubmitting(false);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Does this look right?</h2>
      <p className="mt-1 text-sm text-slate-600">
        Here&apos;s what we picked up from your files. Uncheck anything that&apos;s
        wrong — we&apos;ll leave it out. Then we&apos;ll research both systems,
        which takes a few minutes.
      </p>

      {conflicts.length > 0 ? (
        <section className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">
            A few things to check first
          </h3>
          <p className="mt-1 text-xs text-amber-800">
            These don&apos;t match the answers you gave. Tick the ones where your
            answers are right after all — untick to drop the note entirely.
          </p>
          <ul className="mt-3 space-y-2">
            {conflicts.map((signal) => (
              <li key={signal.id}>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-white p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={resolved.has(signal.id)}
                    onChange={() => setResolved(toggle(resolved, signal.id))}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block">{signal.value}</span>
                    {signal.source_ref ? (
                      <span className="mt-1 block text-xs italic text-slate-500">
                        &ldquo;{signal.source_ref}&rdquo;
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ORDER.filter((category) => regular.some((s) => s.category === category)).map(
        (category) => (
          <section key={category} className="mt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {CATEGORY_LABELS[category]}
            </h3>
            <ul className="mt-2 space-y-2">
              {regular
                .filter((signal) => signal.category === category)
                .map((signal) => (
                  <li key={signal.id}>
                    <label
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${
                        rejected.has(signal.id)
                          ? "border-slate-200 bg-slate-50 text-slate-400 line-through"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={!rejected.has(signal.id)}
                        onChange={() => setRejected(toggle(rejected, signal.id))}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block">{signal.value}</span>
                        <span className="mt-1 flex flex-wrap gap-2 text-xs">
                          {signal.is_inferred ? (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                              our reading, not stated outright
                            </span>
                          ) : null}
                          {signal.source_ref ? (
                            <span className="italic text-slate-500">
                              &ldquo;{signal.source_ref}&rdquo;
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
            </ul>
          </section>
        )
      )}

      {signals.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
          We didn&apos;t find anything specific in your files. That&apos;s fine —
          we&apos;ll research using your answers alone.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() => void confirm()}
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? "Starting research…" : "Looks right — start research"}
        </button>
      </div>
    </div>
  );
}
