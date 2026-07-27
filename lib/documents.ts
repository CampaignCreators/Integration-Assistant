import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import {
  DIRECTION_LABELS,
  objectLabel,
  type DocumentKind,
  type MappingRow,
  type MappingTable,
  type Narrative,
} from "./schemas";

/**
 * Builds the two deliverables as .docx.
 *
 * The brief is for the client and the handoff is for the developer, so they share
 * the confirmed mapping but not the level of detail: the brief names objects, the
 * handoff names fields.
 */

const CELL_MARGIN = { top: 60, bottom: 60, left: 100, right: 100 };

export interface BuildInput {
  kind: DocumentKind;
  targetSoftware: string;
  useCase: string;
  mapping: MappingTable;
  narrative: Narrative;
  answers: { question: string; answer: string }[];
  sources: string[];
  demo: boolean;
  generatedAt: Date;
}

export async function buildDocument(input: BuildInput): Promise<Buffer> {
  const children =
    input.kind === "brief" ? briefBody(input) : handoffBody(input);

  const document = new Document({
    creator: "Integration Assistant",
    title: `${input.narrative.integration_title} — ${
      input.kind === "brief" ? "Integration Brief" : "Developer Handoff"
    }`,
    sections: [{ children }],
  });

  return Packer.toBuffer(document);
}

export function documentFilename(kind: DocumentKind, targetSoftware: string): string {
  const slug =
    targetSoftware
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "integration";
  const name = kind === "brief" ? "integration-brief" : "developer-handoff";
  return `${slug}-${name}.docx`;
}

// ───────────────────────────────────────────────────────────── the brief

function briefBody(input: BuildInput): Paragraph[] | (Paragraph | Table)[] {
  const { narrative, mapping } = input;
  const blocks: (Paragraph | Table)[] = [
    title(narrative.integration_title),
    subtitle("Integration Brief"),
    ...demoBanner(input),
    metaLine(input),

    heading("What this achieves"),
    body(narrative.business_goal),

    heading("What is in scope"),
    body(narrative.scope_summary),
    objectsTable(mapping),
  ];

  if (narrative.out_of_scope.length > 0) {
    blocks.push(heading("What is not in scope"), ...bullets(narrative.out_of_scope));
  }

  blocks.push(heading("How the systems will work together"), body(narrative.systems_overview));
  blocks.push(heading("How often data moves"), body(narrative.sync_behaviour));
  blocks.push(heading("What we need from you"), body(narrative.auth_and_access));

  if (mapping.assumptions.length > 0) {
    blocks.push(heading("What we assumed"), ...bullets(mapping.assumptions));
  }
  if (mapping.open_questions.length > 0) {
    blocks.push(heading("Still to confirm"), ...bullets(mapping.open_questions));
  }
  if (narrative.risks.length > 0) {
    blocks.push(heading("Risks"), ...bullets(narrative.risks));
  }
  if (narrative.next_steps.length > 0) {
    blocks.push(heading("Next steps"), ...bullets(narrative.next_steps));
  }

  return blocks;
}

// ─────────────────────────────────────────────────────────── the handoff

function handoffBody(input: BuildInput): (Paragraph | Table)[] {
  const { narrative, mapping } = input;
  const blocks: (Paragraph | Table)[] = [
    title(narrative.integration_title),
    subtitle("Developer Handoff"),
    ...demoBanner(input),
    metaLine(input),

    heading("Purpose"),
    body(narrative.business_goal),
    body(mapping.summary),

    heading("Systems"),
    body(narrative.systems_overview),

    heading("Authentication and access"),
    body(narrative.auth_and_access),

    heading("Sync behaviour"),
    body(narrative.sync_behaviour),

    heading("Objects in scope"),
    objectsTable(mapping),

    heading("Field mapping"),
  ];

  // One table per object, so a developer can work through them in order.
  for (const object of mapping.objects) {
    const rows = mapping.rows.filter(
      (row) =>
        row.hubspot_object === object.hubspot_object &&
        row.external_object === object.external_object
    );
    blocks.push(
      subheading(
        `${objectLabel(object.hubspot_object, object.hubspot_object_name)} ↔ ${object.external_object}`
      )
    );
    blocks.push(
      body(`Match on ${object.match_key}. Direction: ${DIRECTION_LABELS[object.direction]}.`)
    );
    blocks.push(rows.length > 0 ? fieldTable(rows) : body("No field rows recorded."));
  }

  const orphans = mapping.rows.filter(
    (row) =>
      !mapping.objects.some(
        (object) =>
          object.hubspot_object === row.hubspot_object &&
          object.external_object === row.external_object
      )
  );
  if (orphans.length > 0) {
    blocks.push(subheading("Other mapped fields"), fieldTable(orphans));
  }

  const unknowns = mapping.rows.filter((row) => isUnknown(row.external_field));
  if (unknowns.length > 0) {
    blocks.push(
      heading("Fields that still need confirming"),
      body(
        "These rows have no confirmed field name on the other system. Confirm each " +
          "against the live API before building."
      ),
      ...bullets(
        unknowns.map(
          (row) =>
            `${objectLabel(row.hubspot_object, row.hubspot_object_name)} → ${row.hubspot_property} ` +
            `(from ${row.external_object})${row.notes ? ` — ${row.notes}` : ""}`
        )
      )
    );
  }

  if (mapping.assumptions.length > 0) {
    blocks.push(heading("Assumptions"), ...bullets(mapping.assumptions));
  }
  if (narrative.edge_cases.length > 0) {
    blocks.push(heading("Edge cases"), ...bullets(narrative.edge_cases));
  }
  blocks.push(heading("Error handling"), body(narrative.error_handling));
  if (narrative.testing_checklist.length > 0) {
    blocks.push(heading("Testing checklist"), ...bullets(narrative.testing_checklist));
  }
  if (mapping.open_questions.length > 0) {
    blocks.push(heading("Open questions"), ...bullets(mapping.open_questions));
  }
  if (input.answers.length > 0) {
    blocks.push(heading("Answers given during scoping"));
    for (const answer of input.answers) {
      blocks.push(body(answer.question, true), body(answer.answer));
    }
  }
  if (input.sources.length > 0) {
    blocks.push(heading("Sources consulted"), ...bullets(input.sources));
  }

  return blocks;
}

// ────────────────────────────────────────────────────────────── building blocks

export function isUnknown(field: string): boolean {
  return field.trim().toUpperCase() === "UNKNOWN";
}

function title(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.TITLE });
}

function subtitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, color: "666666", size: 26 })],
    spacing: { after: 200 },
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 140 },
  });
}

function subheading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
  });
}

function body(text: string, bold = false): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold })],
    spacing: { after: 140 },
  });
}

function bullets(items: string[]): Paragraph[] {
  return items.map(
    (item) => new Paragraph({ text: item, bullet: { level: 0 }, spacing: { after: 80 } })
  );
}

function metaLine(input: BuildInput): Paragraph {
  const date = input.generatedAt.toISOString().slice(0, 10);
  return new Paragraph({
    children: [
      new TextRun({
        text: `${input.targetSoftware} ↔ HubSpot · generated ${date}`,
        color: "888888",
        size: 20,
      }),
    ],
    spacing: { after: 240 },
  });
}

function demoBanner(input: BuildInput): Paragraph[] {
  if (!input.demo) return [];
  return [
    new Paragraph({
      children: [
        new TextRun({
          text:
            "DEMO OUTPUT — this document was generated without an Anthropic API key. " +
            "Every finding in it is placeholder text. Do not send it to a client.",
          bold: true,
          color: "B00020",
        }),
      ],
      spacing: { after: 240 },
      alignment: AlignmentType.LEFT,
    }),
  ];
}

function objectsTable(mapping: MappingTable): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      headerRow(["HubSpot object", "Other system", "Match on", "Direction", "Why"]),
      ...mapping.objects.map(
        (object) =>
          new TableRow({
            children: [
              cell(objectLabel(object.hubspot_object, object.hubspot_object_name)),
              cell(object.external_object),
              cell(object.match_key),
              cell(DIRECTION_LABELS[object.direction]),
              cell(object.purpose),
            ],
          })
      ),
    ],
  });
}

function fieldTable(rows: MappingRow[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      headerRow([
        "Other system field",
        "HubSpot property",
        "Direction",
        "Key",
        "Req",
        "Transform / notes",
      ]),
      ...rows.map(
        (row) =>
          new TableRow({
            children: [
              cell(`${row.external_object}.${row.external_field}`, isUnknown(row.external_field)),
              cell(row.hubspot_property),
              cell(DIRECTION_LABELS[row.direction]),
              cell(row.is_match_key ? "Yes" : ""),
              cell(row.required ? "Yes" : ""),
              cell([row.transform, row.notes].filter(Boolean).join(" · ")),
            ],
          })
      ),
    ],
  });
}

function headerRow(labels: string[]): TableRow {
  return new TableRow({
    tableHeader: true,
    children: labels.map(
      (label) =>
        new TableCell({
          margins: CELL_MARGIN,
          shading: { fill: "F1F5F9" },
          children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
        })
    ),
  });
}

function cell(text: string, flag = false): TableCell {
  return new TableCell({
    margins: CELL_MARGIN,
    shading: flag ? { fill: "FFF4E5" } : undefined,
    children: [
      new Paragraph({
        children: [new TextRun({ text: text || "—", color: flag ? "B45309" : undefined })],
      }),
    ],
  });
}
