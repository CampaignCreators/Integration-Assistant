import ExcelJS from "exceljs";
import { APPROACH_LABELS, type FieldMappingRow, type RunRow } from "@cc/shared";

/**
 * Renders the Data Mapping Table (spec §5.5.2) as .xlsx and .csv.
 *
 * Column order matches the spec exactly so the artefact is the same shape every
 * time. Rows carrying UNKNOWN or a gap note are highlighted, because the point
 * of flagging an unknown is that a human notices it.
 */

const COLUMNS = [
  { header: "Source object / field", key: "source", width: 34 },
  { header: "Target object / field", key: "target", width: 34 },
  { header: "Direction", key: "direction", width: 12 },
  { header: "Transformation", key: "transform", width: 34 },
  { header: "Required", key: "required", width: 10 },
  { header: "Match / dedupe key", key: "match_key", width: 18 },
  { header: "Notes", key: "notes", width: 46 },
] as const;

export interface SheetInput {
  run: RunRow;
  mappings: FieldMappingRow[];
  matchStrategy: string;
  gaps: string[];
  generatedAt: Date;
}

function cellsFor(row: FieldMappingRow) {
  return {
    source: `${row.source_obj} → ${row.source_field}`,
    target: `${row.target_obj} → ${row.target_field}`,
    direction: row.direction === "two_way" ? "Two-way" : "One-way",
    transform: row.transform ?? "—",
    required: row.required ? "Yes" : "No",
    match_key: row.match_key ? "Yes" : "",
    notes: row.notes ?? "",
  };
}

/** A row needing human attention: an unresolved field or a flagged note. */
export function needsAttention(row: FieldMappingRow): boolean {
  const unknown = /\bunknown\b/i;
  return (
    unknown.test(row.source_field) ||
    unknown.test(row.target_field) ||
    (row.notes !== null && /\b(unknown|gap|uncertain|custom property)\b/i.test(row.notes))
  );
}

export async function renderMappingSheet(input: SheetInput): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Campaign Creators · CC Integration App";
  workbook.created = input.generatedAt;

  const sheet = workbook.addWorksheet("Field Mapping", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.columns = COLUMNS.map((c) => ({ ...c }));

  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1F3864" },
  };
  sheet.getRow(1).alignment = { vertical: "middle" };
  sheet.getRow(1).height = 22;

  for (const mapping of input.mappings) {
    const row = sheet.addRow(cellsFor(mapping));
    row.alignment = { vertical: "top", wrapText: true };
    if (needsAttention(mapping)) {
      row.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFFF2CC" },
      };
    }
    if (mapping.match_key) {
      row.getCell("match_key").font = { bold: true };
    }
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, input.mappings.length + 1), column: COLUMNS.length },
  };

  // A second sheet carries the context a bare table would lose.
  const about = workbook.addWorksheet("About this mapping");
  about.columns = [
    { header: "", key: "label", width: 26 },
    { header: "", key: "value", width: 100 },
  ];
  const facts: [string, string][] = [
    ["Integration", `HubSpot ↔ ${input.run.target_software ?? "target system"}`],
    [
      "Recommended approach",
      input.run.recommended_approach
        ? APPROACH_LABELS[input.run.recommended_approach]
        : "Not determined",
    ],
    ["Confidence", input.run.confidence ?? "Not determined"],
    ["Generated", input.generatedAt.toISOString()],
    ["Rows", String(input.mappings.length)],
    [
      "Rows needing attention",
      String(input.mappings.filter(needsAttention).length),
    ],
    ["How records are matched", input.matchStrategy],
  ];
  for (const [label, value] of facts) {
    const row = about.addRow({ label, value });
    row.getCell("label").font = { bold: true };
    row.alignment = { vertical: "top", wrapText: true };
  }
  if (input.gaps.length > 0) {
    about.addRow({});
    const header = about.addRow({ label: "Known gaps", value: "" });
    header.getCell("label").font = { bold: true };
    for (const gap of input.gaps) {
      about.addRow({ label: "", value: gap }).alignment = {
        vertical: "top",
        wrapText: true,
      };
    }
  }
  about.addRow({});
  const note = about.addRow({
    label: "",
    value:
      "Highlighted rows on the Field Mapping sheet need a human decision — a field " +
      "the research could not establish, or a custom property that must be created " +
      "before the sync will work.",
  });
  note.getCell("value").font = { italic: true };
  note.alignment = { vertical: "top", wrapText: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** CSV of the same table, for anyone who would rather not open a spreadsheet. */
export function renderMappingCsv(mappings: FieldMappingRow[]): Buffer {
  const lines = [COLUMNS.map((c) => c.header).join(",")];
  for (const mapping of mappings) {
    const cells = cellsFor(mapping);
    lines.push(COLUMNS.map((c) => csvEscape(cells[c.key])).join(","));
  }
  return Buffer.from(`${lines.join("\n")}\n`, "utf-8");
}

export function csvEscape(value: string): string {
  // Quote when the value contains a delimiter, quote, or newline; double inner
  // quotes. Also guard against spreadsheet formula injection.
  const guarded = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}
