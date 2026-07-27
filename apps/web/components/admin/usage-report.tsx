import { APPROACH_LABELS, type RunCostSummaryRow } from "@cc/shared";

export interface UsageResponse {
  totals: {
    runs: number;
    cost_usd: number;
    tokens: number;
    average_cost_per_run: number;
  };
  by_step: { step: string; calls: number; cost: number; tokens: number }[];
  runs: (RunCostSummaryRow & { user_email: string | null })[];
}

const STEP_LABELS: Record<string, string> = {
  extract_signals: "Reading uploaded files",
  research_hubspot: "Researching HubSpot",
  research_target: "Researching the other software",
  check_marketplace: "Marketplace check",
  assess_middleware: "Make / Zapier check",
  decide_approach: "Writing the recommendation",
  build_mappings: "Building the field mapping",
};

const money = (value: number) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/** Where the money goes (spec §10 cost control). */
export function UsageReport({ usage }: { usage: UsageResponse }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">Usage and cost</h2>

      <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Runs" value={usage.totals.runs.toLocaleString()} />
        <Stat label="Total cost" value={money(usage.totals.cost_usd)} />
        <Stat label="Average per run" value={money(usage.totals.average_cost_per_run)} />
        <Stat label="Tokens" value={usage.totals.tokens.toLocaleString()} />
      </dl>

      {usage.by_step.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Cost by step
          </h3>
          <ul className="mt-2 space-y-1.5">
            {usage.by_step.map((step) => {
              const share =
                usage.totals.cost_usd > 0 ? (step.cost / usage.totals.cost_usd) * 100 : 0;
              return (
                <li key={step.step} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span>{STEP_LABELS[step.step] ?? step.step}</span>
                    <span className="shrink-0 tabular-nums text-slate-600">
                      {money(step.cost)} · {step.calls} call{step.calls === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${share}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {usage.runs.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent runs
          </h3>
          <table className="mt-2 w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Integration</th>
                <th className="py-2 pr-4">Started by</th>
                <th className="py-2 pr-4">Outcome</th>
                <th className="py-2 pr-4 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {usage.runs.map((run) => (
                <tr key={run.run_id} className="border-t border-slate-100">
                  <td className="py-2 pr-4">{run.target_software ?? "Untitled"}</td>
                  <td className="py-2 pr-4 text-slate-600">{run.user_email ?? "—"}</td>
                  <td className="py-2 pr-4 text-slate-600">
                    {run.recommended_approach
                      ? APPROACH_LABELS[run.recommended_approach]
                      : run.status}
                  </td>
                  <td className="py-2 pr-4 text-right tabular-nums text-slate-600">
                    {money(Number(run.cost_usd))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <p className="mt-4 text-xs text-slate-500">
        Costs are estimates from recorded token and search usage, priced at the rates
        configured on the worker. Treat them as a guide, not a bill.
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
