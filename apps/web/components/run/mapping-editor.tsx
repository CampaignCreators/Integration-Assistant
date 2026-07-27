"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FieldMappingRow, MappingMeta } from "@cc/shared";

interface EditableRow {
  id?: string;
  key: string;
  source_obj: string;
  source_field: string;
  target_obj: string;
  target_field: string;
  direction: "one_way" | "two_way";
  transform: string;
  required: boolean;
  match_key: boolean;
  notes: string;
}

function toEditable(row: FieldMappingRow): EditableRow {
  return {
    id: row.id,
    key: row.id,
    source_obj: row.source_obj,
    source_field: row.source_field,
    target_obj: row.target_obj,
    target_field: row.target_field,
    direction: row.direction,
    transform: row.transform ?? "",
    required: row.required,
    match_key: row.match_key,
    notes: row.notes ?? "",
  };
}

function blankRow(): EditableRow {
  return {
    key: `new-${Math.random().toString(36).slice(2)}`,
    source_obj: "",
    source_field: "",
    target_obj: "",
    target_field: "",
    direction: "one_way",
    transform: "",
    required: false,
    match_key: false,
    notes: "",
  };
}

function needsAttention(row: EditableRow): boolean {
  const unknown = /\bunknown\b/i;
  return (
    unknown.test(row.source_field) ||
    unknown.test(row.target_field) ||
    /\b(unknown|gap|uncertain|custom property)\b/i.test(row.notes)
  );
}

/**
 * Editable mapping table (spec §7 `PATCH /runs/:id/mappings`). Saving sends the
 * whole table, so row order here becomes the order in the spreadsheet.
 *
 * Regenerating rebuilds both documents from these rows — the mapping builder is
 * not re-run, so corrections are never overwritten.
 */
export function MappingEditor({
  runId,
  initialMappings,
  initialMeta,
}: {
  runId: string;
  initialMappings: FieldMappingRow[];
  initialMeta: MappingMeta | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableRow[]>(initialMappings.map(toEditable));
  const [matchStrategy, setMatchStrategy] = useState(initialMeta?.match_strategy ?? "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<null | "saving" | "regenerating">(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function update(key: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  async function save() {
    setBusy("saving");
    setError(null);
    setNotice(null);

    const incomplete = rows.find(
      (r) => !r.source_obj || !r.source_field || !r.target_obj || !r.target_field
    );
    if (incomplete) {
      setError("Every row needs both objects and both field names filled in.");
      setBusy(null);
      return;
    }

    const response = await fetch(`/api/runs/${runId}/mappings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: rows.map((r) => ({
          ...(r.id ? { id: r.id } : {}),
          source_obj: r.source_obj,
          source_field: r.source_field,
          target_obj: r.target_obj,
          target_field: r.target_field,
          direction: r.direction,
          transform: r.transform.trim() === "" ? null : r.transform,
          required: r.required,
          match_key: r.match_key,
          notes: r.notes.trim() === "" ? null : r.notes,
        })),
        match_strategy: matchStrategy,
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not save your changes.");
      setBusy(null);
      return;
    }

    const { mappings } = (await response.json()) as { mappings: FieldMappingRow[] };
    setRows(mappings.map(toEditable));
    setEditing(false);
    setBusy(null);
    setNotice("Changes saved. Rebuild the documents to include them.");
    router.refresh();
  }

  async function regenerate() {
    setBusy("regenerating");
    setError(null);
    setNotice(null);
    const response = await fetch(`/api/runs/${runId}/generate`, { method: "POST" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error ?? "Could not rebuild the documents.");
      setBusy(null);
      return;
    }
    setBusy(null);
    setNotice("Documents rebuilt — the download links now point at the new version.");
    router.refresh();
  }

  const attention = rows.filter(needsAttention).length;

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-lg font-semibold">Field mapping</h2>
          <p className="mt-1 text-sm text-slate-600">
            {rows.length} field{rows.length === 1 ? "" : "s"}
            {attention > 0 ? ` · ${attention} needing a decision` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setRows(initialMappings.map(toEditable));
                  setMatchStrategy(initialMeta?.match_strategy ?? "");
                  setEditing(false);
                  setError(null);
                }}
                disabled={busy !== null}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy !== null}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy === "saving" ? "Saving…" : "Save changes"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
              >
                Edit mapping
              </button>
              <button
                type="button"
                onClick={() => void regenerate()}
                disabled={busy !== null}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
              >
                {busy === "regenerating" ? "Rebuilding…" : "Rebuild documents"}
              </button>
            </>
          )}
        </div>
      </div>

      {error ? (
        <p className="border-b border-slate-200 bg-red-50 px-5 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="border-b border-slate-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-800" role="status">
          {notice}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">From</th>
              <th className="px-4 py-3">To</th>
              <th className="px-4 py-3">Direction</th>
              <th className="px-4 py-3">Change needed</th>
              <th className="px-4 py-3">Notes</th>
              {editing ? <th className="px-4 py-3" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.key}
                className={`border-b border-slate-100 align-top last:border-0 ${
                  needsAttention(row) ? "bg-amber-50" : ""
                }`}
              >
                {editing ? (
                  <>
                    <td className="px-4 py-3">
                      <Input
                        label="Source object"
                        value={row.source_obj}
                        onChange={(v) => update(row.key, { source_obj: v })}
                      />
                      <Input
                        label="Source field"
                        value={row.source_field}
                        onChange={(v) => update(row.key, { source_field: v })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Input
                        label="Target object"
                        value={row.target_obj}
                        onChange={(v) => update(row.key, { target_obj: v })}
                      />
                      <Input
                        label="Target field"
                        value={row.target_field}
                        onChange={(v) => update(row.key, { target_field: v })}
                      />
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={row.required}
                          onChange={(e) => update(row.key, { required: e.target.checked })}
                        />
                        Required
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        aria-label="Direction"
                        value={row.direction}
                        onChange={(e) =>
                          update(row.key, {
                            direction: e.target.value as "one_way" | "two_way",
                          })
                        }
                        className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="one_way">One-way</option>
                        <option value="two_way">Two-way</option>
                      </select>
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={row.match_key}
                          onChange={(e) => update(row.key, { match_key: e.target.checked })}
                        />
                        Matches records
                      </label>
                    </td>
                    <td className="px-4 py-3">
                      <Textarea
                        label="Transformation"
                        value={row.transform}
                        onChange={(v) => update(row.key, { transform: v })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Textarea
                        label="Notes"
                        value={row.notes}
                        onChange={(v) => update(row.key, { notes: v })}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                        aria-label="Remove this row"
                      >
                        Remove
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <span className="block text-xs text-slate-500">{row.source_obj}</span>
                      <span className="font-medium">{row.source_field}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="block text-xs text-slate-500">{row.target_obj}</span>
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
                    <td className="px-4 py-3 text-slate-600">{row.transform || "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{row.notes}</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <div className="space-y-4 border-t border-slate-200 p-5">
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, blankRow()])}
            className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Add a row
          </button>
          <label className="block">
            <span className="text-sm font-medium text-slate-800">
              How records are matched
            </span>
            <textarea
              rows={3}
              value={matchStrategy}
              onChange={(e) => setMatchStrategy(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-slate-500">
              This paragraph appears in the requirements document.
            </span>
          </label>
        </div>
      ) : null}
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      type="text"
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="mb-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
    />
  );
}

function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      rows={2}
      aria-label={label}
      placeholder={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
    />
  );
}
