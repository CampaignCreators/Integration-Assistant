import Link from "next/link";
import { notFound } from "next/navigation";
import type { RunDetail } from "@cc/shared";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";
import { StatusBadge } from "@/components/status-badge";
import { IntakeWizard } from "@/components/intake/wizard";
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
          {run.error_message}
        </div>
      ) : null}

      {run.status === "draft" ? (
        <div className="mt-8">
          <IntakeWizard run={run} brief={brief} uploads={uploads} />
        </div>
      ) : (
        <SubmittedRunView detail={detail} />
      )}
    </div>
  );
}

function SubmittedRunView({ detail }: { detail: RunDetail }) {
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

      <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Research and document generation arrive in Phase 2.
      </div>
    </div>
  );
}
