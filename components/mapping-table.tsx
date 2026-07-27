"use client";

import {
  addRow,
  groupByObject,
  mappingIssues,
  removeAt,
  removeObject,
  removeRow,
  ungroupedRows,
  updateObject,
  updateRow,
} from "@/lib/mapping";
import { isUnknown } from "@/lib/documents";
import {
  DIRECTIONS,
  DIRECTION_LABELS,
  type MappingRow,
  type MappingTable,
} from "@/lib/schemas";
import { Button, Notice } from "./ui";

/**
 * The recommended mapping, editable in place.
 *
 * Grouped by object because that is how a developer builds it — one object pair
 * at a time — and because "every object" is the thing the reviewer is checking.
 */
export function MappingTableEditor({
  mapping,
  confirmed,
  busy,
  onChange,
  onConfirm,
  onReopen,
}: {
  mapping: MappingTable;
  confirmed: boolean;
  busy: boolean;
  onChange: (mapping: MappingTable) => void;
  onConfirm: () => void;
  onReopen: () => void;
}) {
  const groups = groupByObject(mapping);
  const stranded = ungroupedRows(mapping);
  const issues = mappingIssues(mapping);
  const readOnly = confirmed || busy;

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink">{mapping.summary}</p>

      {groups.map((group, objectIndex) => (
        <div key={`${group.plan.hubspot_object}-${group.plan.external_object}`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h3 className="text-sm font-semibold text-navy">{group.label}</h3>
            {!readOnly ? (
              <Button
                variant="ghost"
                onClick={() => onChange(removeObject(mapping, objectIndex))}
              >
                Remove object
              </Button>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted">{group.plan.purpose}</p>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            <label className="flex items-center gap-1.5">
              Match on
              <input
                className="rounded border border-line px-2 py-1 text-xs text-ink"
                value={group.plan.match_key}
                readOnly={readOnly}
                onChange={(event) =>
                  onChange(updateObject(mapping, objectIndex, { match_key: event.target.value }))
                }
              />
            </label>
            <label className="flex items-center gap-1.5">
              Direction
              <select
                className="rounded border border-line px-2 py-1 text-xs text-ink"
                value={group.plan.direction}
                disabled={readOnly}
                onChange={(event) =>
                  onChange(
                    updateObject(mapping, objectIndex, {
                      direction: event.target.value as MappingRow["direction"],
                    })
                  )
                }
              >
                {DIRECTIONS.map((direction) => (
                  <option key={direction} value={direction}>
                    {DIRECTION_LABELS[direction]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-3 overflow-x-auto rounded-lg border border-line">
            <table className="w-full min-w-[68rem] border-collapse text-sm">
              <thead>
                <tr className="bg-navy-tint text-left text-xs uppercase tracking-wide text-navy">
                  <Th>{group.plan.external_object} field</Th>
                  <Th>HubSpot property</Th>
                  <Th>Direction</Th>
                  <Th narrow>Key</Th>
                  <Th narrow>Req</Th>
                  <Th>Transform</Th>
                  <Th>Notes</Th>
                  <Th narrow> </Th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map(({ row, index }) => (
                  <tr key={index} className="border-t border-line/60 align-top">
                    <Td>
                      <input
                        className={cellClass(isUnknown(row.external_field))}
                        value={row.external_field}
                        readOnly={readOnly}
                        placeholder="field_name"
                        onChange={(event) =>
                          onChange(updateRow(mapping, index, { external_field: event.target.value }))
                        }
                      />
                    </Td>
                    <Td>
                      <input
                        className={cellClass()}
                        value={row.hubspot_property}
                        readOnly={readOnly}
                        placeholder="property"
                        onChange={(event) =>
                          onChange(
                            updateRow(mapping, index, { hubspot_property: event.target.value })
                          )
                        }
                      />
                    </Td>
                    <Td>
                      <select
                        className={cellClass()}
                        value={row.direction}
                        disabled={readOnly}
                        onChange={(event) =>
                          onChange(
                            updateRow(mapping, index, {
                              direction: event.target.value as MappingRow["direction"],
                            })
                          )
                        }
                      >
                        {DIRECTIONS.map((direction) => (
                          <option key={direction} value={direction}>
                            {DIRECTION_LABELS[direction]}
                          </option>
                        ))}
                      </select>
                    </Td>
                    <Td center>
                      <input
                        type="checkbox"
                        checked={row.is_match_key}
                        disabled={readOnly}
                        onChange={(event) =>
                          onChange(updateRow(mapping, index, { is_match_key: event.target.checked }))
                        }
                      />
                    </Td>
                    <Td center>
                      <input
                        type="checkbox"
                        checked={row.required}
                        disabled={readOnly}
                        onChange={(event) =>
                          onChange(updateRow(mapping, index, { required: event.target.checked }))
                        }
                      />
                    </Td>
                    <Td>
                      <input
                        className={cellClass()}
                        value={row.transform ?? ""}
                        readOnly={readOnly}
                        placeholder="—"
                        onChange={(event) =>
                          onChange(
                            updateRow(mapping, index, { transform: event.target.value || null })
                          )
                        }
                      />
                    </Td>
                    <Td>
                      <input
                        className={cellClass()}
                        value={row.notes ?? ""}
                        readOnly={readOnly}
                        placeholder="—"
                        onChange={(event) =>
                          onChange(updateRow(mapping, index, { notes: event.target.value || null }))
                        }
                      />
                    </Td>
                    <Td center>
                      {!readOnly ? (
                        <button
                          type="button"
                          aria-label="Remove row"
                          className="text-muted hover:text-coral-ink"
                          onClick={() => onChange(removeRow(mapping, index))}
                        >
                          ×
                        </button>
                      ) : null}
                    </Td>
                  </tr>
                ))}
                {group.rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-3 text-sm text-muted">
                      No fields mapped for this object yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {!readOnly ? (
            <Button
              variant="secondary"
              className="mt-2"
              onClick={() => onChange(addRow(mapping, group.plan))}
            >
              Add a field
            </Button>
          ) : null}
        </div>
      ))}

      {stranded.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-navy">Rows without an object</h3>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {stranded.map(({ row, index }) => (
              <li key={index} className="flex items-center justify-between gap-3">
                <span>
                  {row.external_object}.{row.external_field || "—"} → {row.hubspot_property || "—"}
                </span>
                {!readOnly ? (
                  <Button variant="ghost" onClick={() => onChange(removeRow(mapping, index))}>
                    Remove
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <EditableList
        title="Assumptions"
        items={mapping.assumptions}
        readOnly={readOnly}
        onRemove={(index) =>
          onChange({ ...mapping, assumptions: removeAt(mapping.assumptions, index) })
        }
      />
      <EditableList
        title="Open questions"
        items={mapping.open_questions}
        readOnly={readOnly}
        onRemove={(index) =>
          onChange({ ...mapping, open_questions: removeAt(mapping.open_questions, index) })
        }
      />

      {issues.length > 0 && !confirmed ? (
        <Notice tone="warn">
          <ul className="space-y-1">
            {issues.map((issue, index) => (
              <li key={index}>{issue.message}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      {confirmed ? (
        <div className="flex flex-wrap items-center gap-3">
          <Notice tone="success">Table logic confirmed.</Notice>
          <Button variant="secondary" onClick={onReopen} disabled={busy}>
            Reopen for editing
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={onConfirm} disabled={busy || mapping.rows.length === 0}>
            Confirm table logic
          </Button>
          <span className="text-xs text-muted">
            Confirming unlocks the brief and the developer handoff.
          </span>
        </div>
      )}
    </div>
  );
}

function EditableList({
  title,
  items,
  readOnly,
  onRemove,
}: {
  title: string;
  items: string[];
  readOnly: boolean;
  onRemove: (index: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-sm font-semibold text-navy">{title}</h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-start justify-between gap-3 text-sm text-ink">
            <span>• {item}</span>
            {!readOnly ? (
              <button
                type="button"
                aria-label={`Remove from ${title}`}
                className="shrink-0 text-muted hover:text-coral-ink"
                onClick={() => onRemove(index)}
              >
                ×
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Th({ children, narrow }: { children: React.ReactNode; narrow?: boolean }) {
  return <th className={`px-3 py-2 font-medium ${narrow ? "w-12" : ""}`}>{children}</th>;
}

function Td({
  children,
  center,
}: {
  children: React.ReactNode;
  center?: boolean;
}) {
  return <td className={`px-3 py-1.5 ${center ? "text-center" : ""}`}>{children}</td>;
}

function cellClass(flag = false): string {
  return `w-full rounded border px-2 py-1 text-sm text-ink ${
    flag ? "border-ember bg-ember-tint text-ember-ink" : "border-transparent bg-transparent"
  } read-only:cursor-default focus:border-blue focus:bg-white focus:outline-none`;
}
