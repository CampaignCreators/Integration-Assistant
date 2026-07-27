"use client";

import type { IntakeInput, UploadRow } from "@cc/shared";
import {
  DIRECTION_LABELS,
  FREQUENCY_LABELS,
  OBJECT_LABELS,
  VOLUME_LABELS,
} from "@/lib/intake-options";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-slate-100 py-3 last:border-0 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm sm:col-span-2">{children}</dd>
    </div>
  );
}

const NOT_SET = <span className="text-amber-700">Not answered yet</span>;

export function ReviewStep({
  value,
  uploads,
}: {
  value: IntakeInput;
  uploads: UploadRow[];
}) {
  const objects = value.objects ?? [];

  return (
    <div>
      <h2 className="text-lg font-semibold">Check your answers</h2>
      <p className="mt-1 text-sm text-slate-600">
        When you submit, we&apos;ll read your files, research both systems, and
        draft your requirements document and field mapping. This usually takes a
        few minutes — you can close the page and come back.
      </p>

      <dl className="mt-6 rounded-xl border border-slate-200 bg-white px-4">
        <Row label="Software to connect">{value.target_software || NOT_SET}</Row>
        <Row label="What it should do">{value.description || NOT_SET}</Row>
        <Row label="Data flows">
          {value.direction ? DIRECTION_LABELS[value.direction] : NOT_SET}
        </Row>
        <Row label="Records involved">
          {objects.length > 0
            ? objects.map((o) => OBJECT_LABELS[o] ?? o).join(", ")
            : NOT_SET}
        </Row>
        <Row label="Sync frequency">
          {value.frequency ? FREQUENCY_LABELS[value.frequency] : NOT_SET}
        </Row>
        <Row label="Kicked off by">
          {value.trigger_event || <span className="text-slate-400">We&apos;ll suggest one</span>}
        </Row>
        <Row label="Record volume">
          {value.volume ? (
            VOLUME_LABELS[value.volume]
          ) : (
            <span className="text-slate-400">Not specified</span>
          )}
        </Row>
        <Row label="Files attached">
          {uploads.length === 0 ? (
            <span className="text-slate-400">None</span>
          ) : (
            <ul className="space-y-1">
              {uploads.map((upload) => (
                <li key={upload.id}>
                  {upload.filename}
                  {upload.status === "failed" ? (
                    <span className="ml-2 text-xs text-amber-700">
                      couldn&apos;t be read
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Row>
      </dl>
    </div>
  );
}
