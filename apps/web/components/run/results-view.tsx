import {
  APPROACH_LABELS,
  type DeliverableRow,
  type FieldMappingRow,
  type RunRow,
} from "@cc/shared";

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-800 border-emerald-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-red-50 text-red-800 border-red-200",
};

/** A mapping row a reviewer still needs to resolve. */
function needsAttention(row: FieldMappingRow): boolean {
  const unknown = /\bunknown\b/i;
  return (
    unknown.test(row.source_field) ||
    unknown.test(row.target_field) ||
    (row.notes !== null && /\b(unknown|gap|uncertain|custom property)\b/i.test(row.notes))
  );
}

/**
 * The results screen (spec §9): the recommendation with its reasoning, the
 * mapping table, and download links for both deliverables.
 */
export function ResultsView({
  run,
  mappings,
  deliverables,
}: {
  run: RunRow;
  mappings: FieldMappingRow[];
  deliverables: DeliverableRow[];
}) {
  const details = run.approach_details_json;
  const hasDoc = deliverables.some((d) => d.kind === "requirements_doc");
  const hasSheet = deliverables.some((d) => d.kind === "mapping_sheet");
  const attention = mappings.filter(needsAttention).length;

  return (
    <div className="mt-8 space-y-6">
      {run.recommended_approach ? (
        <section
          className={`rounded-xl border p-6 ${
            CONFIDENCE_STYLES[run.confidence ?? "medium"] ??
            "border-slate-200 bg-white"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Our recommendation
          </p>
          <h2 className="mt-1 text-2xl font-semibold">
            {APPROACH_LABELS[run.recommended_approach]}
          </h2>
          <p className="mt-1 text-sm opacity-80">
            {run.confidence} confidence
          </p>
          {run.approach_rationale ? (
            <p className="mt-4 text-sm leading-relaxed">{run.approach_rationale}</p>
          ) : null}

          {details?.uncertainty_drivers && details.uncertainty_drivers.length > 0 ? (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-medium">
                What makes this less than certain
              </summary>
              <ul className="mt-2 list-inside list-disc space-y-1 opacity-90">
                {details.uncertainty_drivers.map((driver) => (
                  <li key={driver}>{driver}</li>
                ))}
              </ul>
            </details>
          ) : null}

          {details?.alternatives_considered &&
          details.alternatives_considered.length > 0 ? (
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-medium">
                Alternatives we ruled out
              </summary>
              <ul className="mt-2 space-y-1 opacity-90">
                {details.alternatives_considered.map((alt) => (
                  <li key={alt.approach}>
                    <strong>{APPROACH_LABELS[alt.approach]}</strong> — {alt.why_not}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Your documents</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ready to send to your solutions engineer or the client.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <DownloadLink
            runId={run.id}
            kind="requirements_doc"
            label="Integration Requirements (.docx)"
            available={hasDoc}
          />
          <DownloadLink
            runId={run.id}
            kind="mapping_sheet"
            label="Data Mapping Table (.xlsx)"
            available={hasSheet}
          />
        </div>
      </section>

      {mappings.length > 0 ? (
        <section className="rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-semibold">Field mapping</h2>
              <p className="mt-1 text-sm text-slate-600">
                {mappings.length} field{mappings.length === 1 ? "" : "s"}
                {attention > 0
                  ? ` · ${attention} highlighted for a human decision`
                  : ""}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">From</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Direction</th>
                  <th className="px-4 py-3">Change needed</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 align-top last:border-0 ${
                      needsAttention(row) ? "bg-amber-50" : ""
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className="block text-xs text-slate-500">
                        {row.source_obj}
                      </span>
                      <span className="font-medium">{row.source_field}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-xs text-slate-500">
                        {row.target_obj}
                      </span>
                      <span className="font-medium">{row.target_field}</span>
                      {row.required ? (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                          required
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.direction === "two_way" ? "Two-way" : "One-way"}
                      {row.match_key ? (
                        <span className="mt-1 block text-xs font-medium text-blue-700">
                          matches records
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.transform ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.notes ?? ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {details?.narrative ? (
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Assumptions and open questions</h2>
          <NarrativeList title="Assumptions" items={details.narrative.assumptions} />
          <NarrativeList title="Risks" items={details.narrative.risks} />
          <NarrativeList
            title="Needed from the client"
            items={details.narrative.dependencies}
          />
          <NarrativeList
            title="Open questions"
            items={details.narrative.open_questions}
          />
        </section>
      ) : null}
    </div>
  );
}

function NarrativeList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function DownloadLink({
  runId,
  kind,
  label,
  available,
}: {
  runId: string;
  kind: string;
  label: string;
  available: boolean;
}) {
  if (!available) {
    return (
      <span className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-400">
        {label} — not generated
      </span>
    );
  }
  return (
    <a
      href={`/api/runs/${runId}/deliverables/${kind}`}
      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
    >
      Download {label}
    </a>
  );
}
