import {
  APPROACH_LABELS,
  type DeliverableRow,
  type FieldMappingRow,
  type RunRow,
} from "@cc/shared";
import { MappingEditor } from "./mapping-editor";
import { ReprocessButton } from "./reprocess-button";

const CONFIDENCE_STYLES: Record<string, string> = {
  high: "bg-emerald-50 text-emerald-800 border-emerald-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-red-50 text-red-800 border-red-200",
};

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
        <div className="mt-5 border-t border-slate-200 pt-4">
          <ReprocessButton runId={run.id} />
        </div>
      </section>

      {mappings.length > 0 ? (
        <MappingEditor
          runId={run.id}
          initialMappings={mappings}
          initialMeta={run.mapping_meta_json}
        />
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
