import {
  AlignmentType,
  Document,
  Header,
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
  APPROACH_LABELS,
  type BriefRow,
  type FieldMappingRow,
  type RunRow,
} from "@cc/shared";
import {
  DIRECTION_PHRASES,
  FREQUENCY_PHRASES,
  OBJECT_PHRASES,
  VOLUME_PHRASES,
} from "../llm/phrasing.js";
import type {
  HubSpotResult,
  MarketplaceResult,
  MiddlewareResult,
  NarrativeResult,
  TargetResult,
} from "../llm/schemas.js";
import type { Decision } from "../pipeline/decide.js";

/**
 * Renders the Integration Requirements Document (spec §5.5.1). Section order is
 * fixed so every engagement produces the same artefact.
 */

export interface DocInput {
  run: RunRow;
  brief: BriefRow | null;
  decision: Decision;
  narrative: NarrativeResult;
  findings: {
    hubspot: HubSpotResult;
    target: TargetResult;
    marketplace: MarketplaceResult;
    middleware: MiddlewareResult;
  };
  mappings: FieldMappingRow[];
  matchStrategy: string;
  mappingGaps: string[];
  generatedAt: Date;
}

export async function renderRequirementsDoc(input: DocInput): Promise<Buffer> {
  const { run, brief, decision, narrative, findings } = input;
  const targetName = run.target_software ?? "the target system";

  const children: (Paragraph | Table)[] = [];

  children.push(
    new Paragraph({
      text: `HubSpot ↔ ${targetName} Integration Requirements`,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Prepared ${input.generatedAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })} · Campaign Creators`,
          italics: true,
          color: "666666",
        }),
      ],
    })
  );

  // 1. Overview & business goal
  children.push(heading("1. Overview and business goal"), body(narrative.business_goal));

  // 2. Systems in scope
  children.push(
    heading("2. Systems in scope"),
    body(
      `This integration connects HubSpot and ${targetName}. What follows is what we ` +
        `established about each system from its public documentation.`
    ),
    subheading("HubSpot"),
    body(findings.hubspot.summary),
    bullet(`Authentication: ${findings.hubspot.auth_model}`),
    bullet(
      `Change notifications: ${
        findings.hubspot.webhooks_available
          ? findings.hubspot.webhook_notes ?? "Webhooks are available."
          : "No webhooks for these objects — changes must be polled."
      }`
    ),
    bullet(`Usage limits: ${findings.hubspot.rate_limits}`),
    subheading(targetName),
    body(findings.target.summary),
    bullet(`API availability: ${apiVerdictSentence(findings.target)}`),
    ...(findings.target.auth_model
      ? [bullet(`Authentication: ${findings.target.auth_model}`)]
      : []),
    bullet(
      `Change notifications: ${
        findings.target.webhooks_available
          ? findings.target.webhook_notes ?? "Webhooks are available."
          : "No webhooks found — changes would need to be polled."
      }`
    ),
    ...(findings.target.rate_limits
      ? [bullet(`Usage limits: ${findings.target.rate_limits}`)]
      : [])
  );

  if (findings.target.data_model_mismatches.length > 0) {
    children.push(
      subheading("Where the two data models differ"),
      ...findings.target.data_model_mismatches.map(bullet)
    );
  }

  // 3. Directionality, objects, frequency
  const objects = (brief?.objects ?? []).map((o) => OBJECT_PHRASES[o] ?? o);
  children.push(
    heading("3. What syncs, which way, and how often"),
    twoColumnTable([
      ["Records in scope", objects.length > 0 ? objects.join(", ") : "Not specified"],
      [
        "Direction",
        run.direction ? DIRECTION_PHRASES[run.direction] : "Not specified",
      ],
      [
        "Frequency",
        run.frequency ? FREQUENCY_PHRASES[run.frequency] : "Not specified",
      ],
      ["Trigger", brief?.trigger_event ?? "Not specified"],
      [
        "Approximate volume",
        brief?.volume ? VOLUME_PHRASES[brief.volume] : "Not specified",
      ],
    ])
  );

  // 4. Recommended approach
  children.push(
    heading("4. Recommended approach"),
    new Paragraph({
      children: [
        new TextRun({ text: APPROACH_LABELS[decision.approach], bold: true, size: 28 }),
      ],
      spacing: { before: 120, after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Confidence: ", bold: true }),
        new TextRun({ text: decision.confidence }),
      ],
    }),
    body(narrative.rationale),
    subheading("Why this recommendation"),
    body(decision.basis)
  );

  if (decision.override_applied) {
    children.push(body(decision.override_applied));
  }

  if (decision.uncertainty_drivers.length > 0) {
    children.push(
      subheading("What makes this less than certain"),
      ...decision.uncertainty_drivers.map(bullet)
    );
  }

  if (decision.alternatives_considered.length > 0) {
    children.push(
      subheading("Alternatives considered"),
      ...decision.alternatives_considered.map((alt) =>
        bullet(`${APPROACH_LABELS[alt.approach]} — ${alt.why_not}`)
      )
    );
  }

  // 5. Native marketplace assessment
  children.push(heading("5. Is there a ready-made integration?"));
  const market = findings.marketplace;
  if (market.native_app_exists) {
    children.push(body(market.summary));
    // Only the details research actually established — an empty table is both
    // useless and, in docx, a hard error.
    const listingFacts = (
      [
        ["Publisher", market.publisher],
        ["Pricing", market.pricing_model],
        [
          "Records it syncs",
          market.supported_objects.length > 0
            ? market.supported_objects.join(", ")
            : null,
        ],
        ["Direction", market.supported_direction],
        ["Rating", market.rating],
        ["Listing", market.listing_url],
      ] as [string, string | null][]
    ).filter((row): row is [string, string] => row[1] !== null && row[1] !== "");
    if (listingFacts.length > 0) {
      children.push(twoColumnTable(listingFacts));
    }
    children.push(
      subheading("What users report"),
      body(
        market.reviews_summary ??
          "We could not find user reviews for this app. Treat its reliability as unproven."
      )
    );
    if (market.limitations.length > 0) {
      children.push(subheading("Known limitations"));
      for (const limitation of market.limitations) {
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              ...(limitation.blocking
                ? [new TextRun({ text: "Blocker: ", bold: true, color: "B00020" })]
                : []),
              new TextRun({ text: limitation.limitation }),
            ],
          })
        );
      }
    } else {
      children.push(body("No specific limitations surfaced during research."));
    }
  } else {
    children.push(
      body(
        `We did not find a native HubSpot App Marketplace integration between HubSpot ` +
          `and ${targetName}. ${market.summary}`
      )
    );
  }

  // Middleware assessment, where it is relevant to the decision.
  if (findings.middleware.verdict !== "not_applicable") {
    children.push(
      subheading("Make and Zapier"),
      body(findings.middleware.summary),
      bullet(
        `Make: ${
          findings.middleware.make_connector.exists
            ? "a connector exists"
            : "no connector found"
        }`
      ),
      bullet(
        `Zapier: ${
          findings.middleware.zapier_connector.exists
            ? "an app exists"
            : "no app found"
        }`
      )
    );
    if (findings.middleware.cost_notes) {
      children.push(bullet(`Cost: ${findings.middleware.cost_notes}`));
    }
    if (findings.middleware.latency_notes) {
      children.push(bullet(`Latency: ${findings.middleware.latency_notes}`));
    }
    if (findings.middleware.vendor_action_required) {
      children.push(
        subheading("What to do instead"),
        body(findings.middleware.vendor_action_required)
      );
    }
  }

  // 6. Assumptions, open questions, risks, dependencies
  children.push(heading("6. Assumptions, risks, and open questions"));
  children.push(...listSection("Assumptions", narrative.assumptions));
  children.push(...listSection("Risks", narrative.risks));
  children.push(...listSection("Dependencies", narrative.dependencies));
  children.push(
    ...listSection("Open questions", [
      ...narrative.open_questions,
      ...findings.target.open_questions,
      ...findings.marketplace.open_questions,
      ...findings.middleware.open_questions,
      ...findings.hubspot.open_questions,
    ])
  );

  // 7. Implementation notes
  children.push(heading("7. Implementation notes"));
  children.push(
    ...(narrative.implementation_notes.length > 0
      ? narrative.implementation_notes.map(bullet)
      : [body("No specific implementation notes were recorded.")])
  );
  children.push(subheading("Record matching"), body(input.matchStrategy));
  if (input.mappingGaps.length > 0) {
    children.push(
      subheading("Gaps in the field mapping"),
      ...input.mappingGaps.map(bullet)
    );
  }
  children.push(
    subheading("Field mapping"),
    body(
      input.mappings.length > 0
        ? `${input.mappings.length} field mappings accompany this document in the ` +
            `Data Mapping Table spreadsheet.`
        : "No field mappings were produced for this run."
    )
  );

  // 8. Sources
  children.push(
    heading("8. Sources"),
    body(
      "Every finding above is drawn from the public pages listed here. Anything we " +
        "could not tie to a source appears as an open question rather than a fact."
    )
  );
  const sources = dedupe([
    ...findings.hubspot.sources,
    ...findings.target.sources,
    ...findings.marketplace.sources,
    ...findings.middleware.sources,
  ]);
  children.push(
    ...(sources.length > 0
      ? sources.map((source) =>
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: source, color: "1155CC" })],
          })
        )
      : [body("No sources were recorded for this run.")])
  );

  const doc = new Document({
    creator: "Campaign Creators · CC Integration App",
    title: `HubSpot ↔ ${targetName} Integration Requirements`,
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `HubSpot ↔ ${targetName}`,
                    color: "888888",
                    size: 18,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}

function heading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
  });
}

function subheading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 80 },
  });
}

function body(text: string): Paragraph {
  return new Paragraph({ text, spacing: { after: 120 } });
}

function bullet(text: string): Paragraph {
  return new Paragraph({ text, bullet: { level: 0 } });
}

function listSection(title: string, items: string[]): Paragraph[] {
  return [
    subheading(title),
    ...(items.length > 0
      ? dedupe(items).map(bullet)
      : [body(`No ${title.toLowerCase()} were recorded.`)]),
  ];
}

function twoColumnTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 30, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({ children: [new TextRun({ text: label, bold: true })] }),
              ],
            }),
            new TableCell({
              width: { size: 70, type: WidthType.PERCENTAGE },
              children: [new Paragraph(value)],
            }),
          ],
        })
    ),
  });
}

function apiVerdictSentence(target: TargetResult): string {
  const base = {
    available: "A usable public API is documented",
    limited: "An API exists but is limited or gated",
    none_found: "No public API documentation was found",
  }[target.api_verdict];
  return `${base}. ${target.api_verdict_reason}`;
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}
