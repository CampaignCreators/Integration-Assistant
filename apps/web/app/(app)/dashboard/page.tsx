import Link from "next/link";
import type { RunRow } from "@cc/shared";
import { workerFetch, WorkerApiError } from "@/lib/worker-api";
import { createRun } from "../actions";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let runs: RunRow[] = [];
  let loadError: string | null = null;
  try {
    ({ runs } = await workerFetch<{ runs: RunRow[] }>("/runs"));
  } catch (err) {
    loadError =
      err instanceof WorkerApiError
        ? err.message
        : "Could not reach the worker service. Is it running?";
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Integration runs</h1>
          <p className="mt-1 text-sm text-slate-600">
            Each run turns your discovery material into a requirements document
            and a data mapping table.
          </p>
        </div>
        <form action={createRun}>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            New run
          </button>
        </form>
      </div>

      {loadError ? (
        <div className="mt-8 rounded-lg bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          {loadError}
        </div>
      ) : runs.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
          No runs yet. Click <strong>New run</strong> to start your first
          integration scoping.
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Target software</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Approach</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/runs/${run.id}`} className="font-medium text-blue-700 hover:underline">
                      {run.target_software ?? run.title ?? "Untitled run"}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {run.recommended_approach ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {new Date(run.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
