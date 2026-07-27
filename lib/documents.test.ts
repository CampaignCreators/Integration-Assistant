import { describe, expect, it } from "vitest";
import { demoMapping, demoNarrative, DEMO_MARKER } from "./demo";
import { buildDocument, documentFilename, isUnknown } from "./documents";
import type { BuildInput } from "./documents";
import type { MappingTable } from "./schemas";

/**
 * A .docx is a zip of XML. Reading the text back out of the buffer proves the
 * file is real and that the content actually reached the page — a document that
 * opens but has an empty table would pass a "did it generate" check.
 */

const GENERATED_AT = new Date("2026-07-27T12:00:00Z");

function input(overrides: Partial<BuildInput> = {}): BuildInput {
  return {
    kind: "brief",
    targetSoftware: "ServiceTitan",
    useCase: "Customers should appear in HubSpot",
    mapping: demoMapping("ServiceTitan"),
    narrative: demoNarrative("ServiceTitan"),
    answers: [],
    sources: [],
    demo: false,
    generatedAt: GENERATED_AT,
    ...overrides,
  };
}

/** Pulls readable text out of the generated package. */
async function textOf(buffer: Buffer): Promise<string> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const parts = await Promise.all(
    Object.keys(zip.files)
      .filter((name) => name.endsWith(".xml"))
      .map((name) => zip.files[name]!.async("string"))
  );
  return parts.join("\n").replace(/<[^>]+>/g, " ");
}

describe("buildDocument", () => {
  it("produces a real .docx package", async () => {
    const buffer = await buildDocument(input());
    // PK zip magic — anything else will not open in Word.
    expect(buffer.subarray(0, 2).toString("binary")).toBe("PK");
    expect(buffer.byteLength).toBeGreaterThan(5_000);
  });

  it("puts the mapping into the handoff, field names and all", async () => {
    const buffer = await buildDocument(input({ kind: "handoff" }));
    const text = await textOf(buffer);
    expect(text).toContain("Developer Handoff");
    expect(text).toContain("firstname");
    expect(text).toContain("Split on the first space");
    expect(text).toContain("Order");
  });

  it("keeps endpoint-level detail out of the client brief", async () => {
    const text = await textOf(await buildDocument(input({ kind: "brief" })));
    expect(text).toContain("Integration Brief");
    expect(text).toContain("What this achieves");
    // The brief lists objects, not individual fields.
    expect(text).not.toContain("Split on the first space");
  });

  it("lists unresolved fields in the handoff as work still to do", async () => {
    const text = await textOf(await buildDocument(input({ kind: "handoff" })));
    expect(text).toMatch(/still need confirming/i);
  });

  it("marks demo output as demo output, in both documents", async () => {
    for (const kind of ["brief", "handoff"] as const) {
      const text = await textOf(await buildDocument(input({ kind, demo: true })));
      expect(text).toMatch(/DEMO OUTPUT/);
      expect(text).toMatch(/Do not send it to a client/);
    }
  });

  it("says nothing about demo mode when the run was real", async () => {
    const text = await textOf(await buildDocument(input({ demo: false })));
    expect(text).not.toMatch(/DEMO OUTPUT/);
  });

  it("survives an object with no rows rather than emitting an empty table", async () => {
    const mapping: MappingTable = {
      ...demoMapping("ServiceTitan"),
      rows: [],
    };
    const text = await textOf(await buildDocument(input({ kind: "handoff", mapping })));
    expect(text).toContain("No field rows recorded");
  });

  it("includes rows that no longer belong to an object, so edits cannot lose them", async () => {
    const base = demoMapping("ServiceTitan");
    const mapping: MappingTable = {
      ...base,
      rows: [
        ...base.rows,
        {
          hubspot_object: "tickets",
          hubspot_object_name: null,
          hubspot_property: "subject",
          external_object: "Ghost",
          external_field: "title",
          direction: "to_hubspot",
          is_match_key: false,
          required: false,
          transform: null,
          notes: null,
        },
      ],
    };
    const text = await textOf(await buildDocument(input({ kind: "handoff", mapping })));
    expect(text).toContain("Other mapped fields");
    expect(text).toContain("Ghost");
  });

  it("records the answers given during scoping in the handoff", async () => {
    const text = await textOf(
      await buildDocument(
        input({
          kind: "handoff",
          answers: [{ question: "Which direction?", answer: "Into HubSpot only" }],
        })
      )
    );
    expect(text).toContain("Which direction?");
    expect(text).toContain("Into HubSpot only");
  });

  it("lists sources when there were any", async () => {
    const text = await textOf(
      await buildDocument(input({ kind: "handoff", sources: ["https://example.com/api-docs"] }))
    );
    expect(text).toContain("https://example.com/api-docs");
  });
});

describe("documentFilename", () => {
  it("builds a tidy filename from the software name", () => {
    expect(documentFilename("brief", "ServiceTitan")).toBe("servicetitan-integration-brief.docx");
    expect(documentFilename("handoff", "Sage 200 / Cloud")).toBe(
      "sage-200-cloud-developer-handoff.docx"
    );
  });

  it("falls back rather than producing a nameless file", () => {
    expect(documentFilename("brief", "///")).toBe("integration-integration-brief.docx");
  });
});

describe("isUnknown", () => {
  it("recognises the marker whatever the case or spacing", () => {
    expect(isUnknown("UNKNOWN")).toBe(true);
    expect(isUnknown(" unknown ")).toBe(true);
    expect(isUnknown("unknown_id")).toBe(false);
    expect(isUnknown("email")).toBe(false);
  });
});

describe("demo data", () => {
  it("marks every mapping row and the summary as demo output", () => {
    const mapping = demoMapping("Stripe");
    expect(mapping.summary).toContain(DEMO_MARKER);
    expect(mapping.rows.every((row) => row.notes?.includes(DEMO_MARKER))).toBe(true);
  });

  it("names the software so the demo reads coherently", () => {
    expect(demoMapping("Stripe").summary).toContain("Stripe");
    expect(demoNarrative("Stripe").integration_title).toContain("Stripe");
  });

  it("falls back to a generic name when none was given", () => {
    expect(demoMapping("  ").summary).toContain("the other system");
  });

  it("leaves one field unresolved, so the warning path can be seen", () => {
    expect(demoMapping("Stripe").rows.some((row) => isUnknown(row.external_field))).toBe(true);
  });

  it("states in its open questions that nothing was analysed", () => {
    expect(demoMapping("Stripe").open_questions.join(" ")).toMatch(/demo mode/i);
  });
});
