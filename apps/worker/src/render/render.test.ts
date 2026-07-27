import ExcelJS from "exceljs";
import mammoth from "mammoth";
import type { BriefRow, FieldMappingRow, RunRow } from "@cc/shared";
import { describe, expect, it } from "vitest";
import type {
  HubSpotResult,
  MarketplaceResult,
  MiddlewareResult,
  NarrativeResult,
  TargetResult,
} from "../llm/schemas.js";
import type { Decision } from "../pipeline/decide.js";
import {
  csvEscape,
  needsAttention,
  renderMappingCsv,
  renderMappingSheet,
} from "./mappingSheet.js";
import { renderRequirementsDoc } from "./requirementsDoc.js";
import { deliverableFilename } from "./store.js";

/**
 * Renders real .docx and .xlsx binaries and reads them back, so these tests
 * prove the deliverables actually open — not just that the code ran.
 */

const generatedAt = new Date("2026-03-15T12:00:00Z");

const run: RunRow = {
  id: "run-1",
  user_id: "user-1",
  title: null,
  target_software: "ServiceTitan",
  direction: "target_to_hubspot",
  frequency: "daily",
  status: "generating",
  recommended_approach: "custom",
  confidence: "medium",
  approach_rationale: "A custom build is the only route that covers the brief.",
  approach_details_json: null,
  error_message: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const brief: BriefRow = {
  id: "brief-1",
  run_id: "run-1",
  objects: ["contacts", "deals"],
  trigger_event: "A job is marked complete",
  volume: "10k_100k",
  description: "Bring completed jobs into HubSpot as deals.",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const decision: Decision = {
  approach: "custom",
  basis: "No native app exists and both sides expose usable APIs.",
  override_applied: null,
  confidence: "medium",
  uncertainty_drivers: ["The ServiceTitan API tier was not confirmed."],
  alternatives_considered: [
    { approach: "native", why_not: "No native marketplace app exists for this pairing." },
  ],
};

const narrative: NarrativeResult = {
  business_goal: "The client wants completed jobs to appear in HubSpot automatically.",
  rationale: "A custom build is needed because no ready-made connector covers jobs.",
  assumptions: ["The client is on HubSpot Professional or above."],
  risks: ["ServiceTitan API access may require a plan upgrade."],
  dependencies: ["API credentials from the client's ServiceTitan account."],
  open_questions: ["Which ServiceTitan job statuses count as complete?"],
  implementation_notes: ["Poll nightly; no webhooks are documented."],
};

const findings = {
  hubspot: {
    summary: "HubSpot exposes contacts and deals under the CRM API.",
    objects: [],
    associations: null,
    auth_model: "Private app access token",
    webhooks_available: true,
    webhook_notes: "Webhooks cover contact and deal property changes.",
    rate_limits: "Professional accounts allow roughly 650,000 calls per day.",
    open_questions: [],
    confidence: "high",
    sources: ["https://developers.hubspot.com/docs/api/crm/deals"],
  } satisfies HubSpotResult,
  target: {
    summary: "ServiceTitan publishes a REST API for jobs.",
    api_verdict: "available",
    api_verdict_reason: "Endpoint documentation is published for jobs and customers.",
    docs_url: "https://developer.servicetitan.io",
    api_style: "REST",
    auth_model: "OAuth 2.0 client credentials",
    objects: [],
    webhooks_available: false,
    webhook_notes: null,
    pagination: "Page and pageSize parameters",
    rate_limits: "Documented per-tenant throttling",
    data_model_mismatches: [
      "ServiceTitan stores a single customer name where HubSpot splits first and last.",
    ],
    open_questions: ["Whether the API tier is included in the client's plan."],
    confidence: "medium",
    sources: ["https://developer.servicetitan.io"],
  } satisfies TargetResult,
  marketplace: {
    summary: "No native HubSpot app connects these systems.",
    native_app_exists: false,
    listing_url: null,
    publisher: null,
    pricing_model: null,
    supported_objects: [],
    supported_direction: null,
    rating: null,
    reviews_summary: null,
    limitations: [],
    covers_brief: false,
    open_questions: [],
    confidence: "high",
    sources: ["https://ecosystem.hubspot.com/marketplace/apps"],
  } satisfies MarketplaceResult,
  middleware: {
    summary: "Zapier has a ServiceTitan app but it does not cover job completion.",
    verdict: "not_applicable",
    make_connector: { exists: false, url: null, supported_actions: [] },
    zapier_connector: {
      exists: true,
      url: "https://zapier.com/apps/servicetitan",
      supported_actions: ["New Customer"],
    },
    cost_notes: null,
    latency_notes: "Zapier polling is 1–15 minutes depending on plan.",
    vendor_action_required: null,
    open_questions: [],
    confidence: "high",
    sources: ["https://zapier.com/apps/servicetitan"],
  } satisfies MiddlewareResult,
};

function mapping(overrides: Partial<FieldMappingRow> = {}): FieldMappingRow {
  return {
    id: "map-1",
    run_id: "run-1",
    source_obj: "ServiceTitan · Job",
    source_field: "customerName",
    target_obj: "HubSpot · Contacts",
    target_field: "firstname",
    direction: "one_way",
    transform: "Split full name on the first space",
    required: true,
    match_key: false,
    notes: null,
    position: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const mappings: FieldMappingRow[] = [
  mapping({ id: "m1", source_field: "customerEmail", target_field: "email", match_key: true, transform: null }),
  mapping({ id: "m2", position: 1 }),
  mapping({
    id: "m3",
    position: 2,
    source_field: "UNKNOWN",
    target_field: "servicetitan_job_id",
    notes: "Needs a custom property; the API field name was not established.",
  }),
];

describe("renderRequirementsDoc", () => {
  it("produces a .docx that opens and contains every spec section in order", async () => {
    const buffer = await renderRequirementsDoc({
      run,
      brief,
      decision,
      narrative,
      findings,
      mappings,
      matchStrategy: "Match on email; create the contact when no match is found.",
      mappingGaps: ["The ServiceTitan job identifier field was not established."],
      generatedAt,
    });

    // A real .docx is a zip — the PK signature proves it is not empty markup.
    expect(buffer.subarray(0, 2).toString()).toBe("PK");

    const { value: text } = await mammoth.extractRawText({ buffer });

    const sections = [
      "1. Overview and business goal",
      "2. Systems in scope",
      "3. What syncs, which way, and how often",
      "4. Recommended approach",
      "5. Is there a ready-made integration?",
      "6. Assumptions, risks, and open questions",
      "7. Implementation notes",
      "8. Sources",
    ];
    const positions = sections.map((section) => text.indexOf(section));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("carries the recommendation, its rationale, and its confidence", async () => {
    const buffer = await renderRequirementsDoc({
      run,
      brief,
      decision,
      narrative,
      findings,
      mappings,
      matchStrategy: "Match on email.",
      mappingGaps: [],
      generatedAt,
    });
    const { value: text } = await mammoth.extractRawText({ buffer });

    expect(text).toContain("Build a custom integration");
    expect(text).toContain("Confidence: medium");
    expect(text).toContain(narrative.rationale);
    expect(text).toContain(decision.basis);
    expect(text).toContain("The ServiceTitan API tier was not confirmed.");
    // Alternatives are rendered with their plain-language label, not the enum.
    expect(text).toContain("Use the ready-made HubSpot integration —");
  });

  it("states plainly when no native app was found", async () => {
    const buffer = await renderRequirementsDoc({
      run,
      brief,
      decision,
      narrative,
      findings,
      mappings,
      matchStrategy: "Match on email.",
      mappingGaps: [],
      generatedAt,
    });
    const { value: text } = await mammoth.extractRawText({ buffer });
    expect(text).toMatch(/did not find a native HubSpot App Marketplace integration/i);
  });

  it("surfaces a blocking marketplace limitation as a blocker", async () => {
    const buffer = await renderRequirementsDoc({
      run,
      brief,
      decision,
      narrative,
      findings: {
        ...findings,
        marketplace: {
          ...findings.marketplace,
          native_app_exists: true,
          publisher: "Acme Software",
          rating: "3.1 (12 reviews)",
          reviews_summary: "Users report the sync silently stops.",
          limitations: [
            { limitation: "Cannot select which fields sync", blocking: true, source: null },
            { limitation: "No activity sync", blocking: false, source: null },
          ],
        },
      },
      mappings,
      matchStrategy: "Match on email.",
      mappingGaps: [],
      generatedAt,
    });
    const { value: text } = await mammoth.extractRawText({ buffer });

    expect(text).toContain("Blocker: Cannot select which fields sync");
    expect(text).toContain("No activity sync");
    expect(text).toContain("Users report the sync silently stops.");
    expect(text).toContain("3.1 (12 reviews)");
  });

  it("says reviews are unproven rather than inventing them", async () => {
    const buffer = await renderRequirementsDoc({
      run,
      brief,
      decision,
      narrative,
      findings: {
        ...findings,
        marketplace: {
          ...findings.marketplace,
          native_app_exists: true,
          reviews_summary: null,
        },
      },
      mappings,
      matchStrategy: "Match on email.",
      mappingGaps: [],
      generatedAt,
    });
    const { value: text } = await mammoth.extractRawText({ buffer });
    expect(text).toMatch(/could not find user reviews/i);
    expect(text).toMatch(/reliability as unproven/i);
  });

  it("lists every research source and no duplicates", async () => {
    const buffer = await renderRequirementsDoc({
      run,
      brief,
      decision,
      narrative,
      findings: {
        ...findings,
        // The same URL cited by two steps must appear once.
        middleware: {
          ...findings.middleware,
          sources: ["https://developer.servicetitan.io"],
        },
      },
      mappings,
      matchStrategy: "Match on email.",
      mappingGaps: [],
      generatedAt,
    });
    const { value: text } = await mammoth.extractRawText({ buffer });

    expect(text).toContain("https://developers.hubspot.com/docs/api/crm/deals");
    expect(text).toContain("https://ecosystem.hubspot.com/marketplace/apps");
    const occurrences = text.split("https://developer.servicetitan.io").length - 1;
    // Appears in the sources list once (plus nowhere else in the prose).
    expect(occurrences).toBe(1);
  });

  it("renders without a brief rather than throwing", async () => {
    const buffer = await renderRequirementsDoc({
      run,
      brief: null,
      decision,
      narrative,
      findings,
      mappings: [],
      matchStrategy: "Not determined.",
      mappingGaps: [],
      generatedAt,
    });
    const { value: text } = await mammoth.extractRawText({ buffer });
    expect(text).toContain("Not specified");
    expect(text).toContain("No field mappings were produced for this run.");
  });
});

describe("renderMappingSheet", () => {
  it("produces an .xlsx with the spec's columns in order", async () => {
    const buffer = await renderMappingSheet({
      run,
      mappings,
      matchStrategy: "Match on email.",
      gaps: [],
      generatedAt,
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Field Mapping")!;

    const headers = sheet.getRow(1).values as (string | undefined)[];
    expect(headers.slice(1)).toEqual([
      "Source object / field",
      "Target object / field",
      "Direction",
      "Transformation",
      "Required",
      "Match / dedupe key",
      "Notes",
    ]);
    expect(sheet.rowCount).toBe(mappings.length + 1);
  });

  it("writes each mapping row with its object and field together", async () => {
    const buffer = await renderMappingSheet({
      run,
      mappings,
      matchStrategy: "Match on email.",
      gaps: [],
      generatedAt,
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Field Mapping")!;

    expect(sheet.getRow(2).getCell(1).value).toBe("ServiceTitan · Job → customerEmail");
    expect(sheet.getRow(2).getCell(2).value).toBe("HubSpot · Contacts → email");
    expect(sheet.getRow(2).getCell(3).value).toBe("One-way");
    expect(sheet.getRow(2).getCell(4).value).toBe("—");
    expect(sheet.getRow(2).getCell(6).value).toBe("Yes");
  });

  it("highlights rows a human still has to resolve", async () => {
    const buffer = await renderMappingSheet({
      run,
      mappings,
      matchStrategy: "Match on email.",
      gaps: [],
      generatedAt,
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet("Field Mapping")!;

    // Row 4 is the UNKNOWN row.
    const fill = sheet.getRow(4).fill as ExcelJS.FillPattern;
    expect(fill?.fgColor?.argb).toBe("FFFFF2CC");
    const clean = sheet.getRow(3).fill as ExcelJS.FillPattern | undefined;
    expect(clean?.fgColor?.argb).toBeUndefined();
  });

  it("records context and gaps on a second sheet", async () => {
    const buffer = await renderMappingSheet({
      run,
      mappings,
      matchStrategy: "Match on email; create when no match is found.",
      gaps: ["The ServiceTitan job identifier was not established."],
      generatedAt,
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const about = workbook.getWorksheet("About this mapping")!;

    const text = about
      .getSheetValues()
      .flatMap((row) => (Array.isArray(row) ? row : []))
      .filter((v): v is string => typeof v === "string")
      .join(" | ");

    expect(text).toContain("HubSpot ↔ ServiceTitan");
    expect(text).toContain("Build a custom integration");
    expect(text).toContain("Match on email; create when no match is found.");
    expect(text).toContain("The ServiceTitan job identifier was not established.");
    expect(text).toContain("Rows needing attention");
  });

  it("produces a valid empty sheet when there are no mappings", async () => {
    const buffer = await renderMappingSheet({
      run,
      mappings: [],
      matchStrategy: "Not determined.",
      gaps: [],
      generatedAt,
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.getWorksheet("Field Mapping")!.rowCount).toBe(1);
  });
});

describe("needsAttention", () => {
  it("flags unknown fields on either side", () => {
    expect(needsAttention(mapping({ source_field: "UNKNOWN" }))).toBe(true);
    expect(needsAttention(mapping({ target_field: "unknown" }))).toBe(true);
  });

  it("flags a note about a gap or a custom property", () => {
    expect(needsAttention(mapping({ notes: "Needs a custom property" }))).toBe(true);
    expect(needsAttention(mapping({ notes: "Uncertain which status maps here" }))).toBe(true);
  });

  it("leaves a fully resolved row alone", () => {
    expect(needsAttention(mapping({ notes: "Straight copy" }))).toBe(false);
  });
});

describe("renderMappingCsv", () => {
  it("writes a header plus one line per mapping", () => {
    const csv = renderMappingCsv(mappings).toString("utf-8");
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(mappings.length + 1);
    expect(lines[0]).toContain("Source object / field");
  });

  it("quotes values containing commas so columns do not shift", () => {
    const csv = renderMappingCsv([
      mapping({ notes: "Split on space, then trim" }),
    ]).toString("utf-8");
    expect(csv).toContain('"Split on space, then trim"');
  });
});

describe("csvEscape", () => {
  it("escapes embedded quotes by doubling them", () => {
    expect(csvEscape('He said "yes"')).toBe('"He said ""yes"""');
  });

  it("neutralises values a spreadsheet would treat as a formula", () => {
    expect(csvEscape("=1+1")).toBe("'=1+1");
    expect(csvEscape("+SUM(A1)")).toBe("'+SUM(A1)");
    expect(csvEscape("@import")).toBe("'@import");
  });

  it("leaves ordinary values untouched", () => {
    expect(csvEscape("email")).toBe("email");
  });
});

describe("deliverableFilename", () => {
  it("names files after the integration and version", () => {
    expect(deliverableFilename("ServiceTitan", "requirements_doc", "docx", 2)).toBe(
      "hubspot-servicetitan-integration-requirements-v2.docx"
    );
    expect(deliverableFilename("Monday.com", "mapping_sheet", "xlsx", 1)).toBe(
      "hubspot-monday-com-data-mapping-table-v1.xlsx"
    );
  });

  it("copes with an unnamed target", () => {
    expect(deliverableFilename(null, "requirements_doc", "docx", 1)).toBe(
      "hubspot-integration-integration-requirements-v1.docx"
    );
  });

  it("strips characters that would break a storage path", () => {
    const name = deliverableFilename("Acme / Corp™", "mapping_sheet", "csv", 3);
    expect(name).toBe("hubspot-acme-corp-data-mapping-table-v3.csv");
    expect(name).not.toMatch(/[^a-z0-9.-]/);
  });
});
