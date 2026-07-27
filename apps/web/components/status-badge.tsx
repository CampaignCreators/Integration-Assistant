import type { RunStatus } from "@cc/shared";

const LABELS: Record<RunStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  extracting: "Reading files",
  awaiting_confirmation: "Needs your review",
  researching: "Researching",
  generating: "Writing documents",
  complete: "Complete",
  failed: "Failed",
};

const STYLES: Record<RunStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  queued: "bg-slate-100 text-slate-700",
  extracting: "bg-blue-50 text-blue-700",
  awaiting_confirmation: "bg-amber-50 text-amber-800",
  researching: "bg-blue-50 text-blue-700",
  generating: "bg-blue-50 text-blue-700",
  complete: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

export function StatusBadge({ status }: { status: RunStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
