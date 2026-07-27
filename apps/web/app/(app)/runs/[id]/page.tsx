import Link from "next/link";
import { notFound } from "next/navigation";
import type {
  DeliverableRow,
  ExtractedSignalRow,
  FieldMappingRow,
  ResearchFindingRow,
  RunDetail,
  RunEventRow,
} from "@cc/shared";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";
import { StatusBadge } from "@/components/status-badge";
import { IntakeWizard } from "@/components/intake/wizard";
import { FindingsView } from "@/components/run/findings-view";
import { ProcessingView } from "@/components/run/processing-view";
import { ResultsView } from "@/components/run/results-view";
import { SignalConfirmation } from "@/components/run/signal-confirmation";
import {
  DIRECTION_LABELS,
  FREQUENCY_LABELS,
  OBJECT_LABELS,
} from "@/lib/intake-options";

export const dynamic = "force-dynamic";

export default async function RunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let detail: RunDetail;
  try {
    detail = await workerFetch<RunDetail>(`/runs/${id}`);
  } catch (err) {
    if (err instanceof WorkerApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }
  const { run, brief, uploads } = detail;

  return (
    <div>
      <Link href="/dashboard" className="text-sm text-blue-700 hover:underline">
        ← Back to runs
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">
          {run.target_software ?? run.title ?? "New integration run"}
        </h1>
        <StatusBadge status={run.status} />
      </div>

      {run.error_message ? (
        <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-800" role="alert">
          <strong className="font-semibold">This run stopped: </strong>
          {run.error_message}
        </div>
      ) : null}

      {run.status === "draft" ? (
        <div className="mt-8">
          <IntakeWizard run={run} brief={brief} uploads={uploads} />
        </div>
      ) : (
        <>
          <BriefSummary detail={detail} />
          {run.status === "awaiting_confirmation" ? (
            <div className="mt-8">
              <SignalConfirmation runId={run.id} signals={await loadSignals(run.id)} />
            </div>
          ) : null}

          {run.status === "complete" ? <Results run={run} /> : null}

          {run.status !== "awaiting_confirmation" && run.status !== "complete" ? (
            <ProcessingView
              runId={run.id}
              status={run.status}
              initialEvents={await loadEvents(run.id)}
            />
          ) : null}

          <Findings runId={run.id} />
        </>
      )}
    </div>
  );
}

async function Results({ run }: { run: RunDetail["run"] }) {
  const [{ mappings }, { deliverables }] = await Promise.all([
    workerFetch<{ mappings: FieldMappingRow[] }>(`/runs/${run.id}/mappings`),
    workerFetch<{ deliverables: DeliverableRow[] }>(`/runs/${run.id}/deliverables`),
  ]);
  return <ResultsView run={run} mappings={mappings} deliverables={deliverables} />;
}

async function loadSignals(runId: string): Promise<ExtractedSignalRow[]> {
  const { signals } = await workerFetch<{ signals: ExtractedSignalRow[] }>(
    `/runs/${runId}/signals`
  );
  return signals;
}

async function loadEvents(runId: string): Promise<RunEventRow[]> {
  const { events } = await workerFetch<{ events: RunEventRow[] }>(
    `/runs/${runId}/events`
  );
  return events;
}

async function Findings({ runId }: { runId: string }) {
  const { findings } = await workerFetch<{ findings: ResearchFindingRow[] }>(
    `/runs/${runId}/findings`
  );
  if (findings.length === 0) return null;
  return <FindingsView findings={findings} />;
}

function BriefSummary({ detail }: { detail: RunDetail }) {
  const { run, brief, uploads } = detail;
  const objects = brief?.objects ?? [];

  return (
    <div>
      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Data flows</dt>
          <dd className="mt-1 text-sm">
            {run.direction ? DIRECTION_LABELS[run.direction] : "—"}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-500">Syncs</dt>
          <dd className="mt-1 text-sm">
            {run.frequency ? FREQUENCY_LABELS[run.frequency] : "—"}
          </dd>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Files attached
          </dt>
          <dd className="mt-1 text-sm">{uploads.length}</dd>
        </div>
      </dl>

      {brief?.description ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xs uppercase tracking-wide text-slate-500">
            What this integration should do
          </h2>
          <p className="mt-1 text-sm">{brief.description}</p>
        </div>
      ) : null}

      {objects.length > 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-xs uppercase tracking-wide text-slate-500">
            Records involved
          </h2>
          <p className="mt-1 text-sm">
            {objects.map((o) => OBJECT_LABELS[o] ?? o).join(", ")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
