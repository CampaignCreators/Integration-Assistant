import { Document, Packer, Paragraph, HeadingLevel } from "docx";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { extractText } from "./text.js";

/**
 * Round-trips real .docx and .pdf binaries through the extractor so the
 * mammoth/unpdf integrations are covered, not just the plain-text paths.
 */

async function makeDocx(lines: string[]): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: "Discovery Notes", heading: HeadingLevel.HEADING_1 }),
          ...lines.map((line) => new Paragraph({ text: line })),
        ],
      },
    ],
  });
  return Packer.toBuffer(doc);
}

async function makePdf(lines: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([612, 792]);
  lines.forEach((line, index) => {
    page.drawText(line, { x: 50, y: 700 - index * 20, size: 12, font });
  });
  return Buffer.from(await pdf.save());
}

describe("extractText with real binaries", () => {
  it("pulls paragraph text out of a .docx", async () => {
    const buffer = await makeDocx([
      "The client uses ServiceTitan for job scheduling.",
      "They want closed jobs to create deals in HubSpot.",
    ]);

    const text = await extractText(buffer, "docx");

    expect(text).toContain("Discovery Notes");
    expect(text).toContain("The client uses ServiceTitan for job scheduling.");
    expect(text).toContain("They want closed jobs to create deals in HubSpot.");
  });

  it("pulls text out of a .pdf", async () => {
    const buffer = await makePdf([
      "Requirements: sync contacts and companies.",
      "Frequency: nightly is acceptable.",
    ]);

    const text = await extractText(buffer, "pdf");

    expect(text).toContain("sync contacts and companies");
    expect(text).toContain("nightly is acceptable");
  });

  it("rejects a file whose contents do not match its declared type", async () => {
    const notADocx = Buffer.from("this is plainly not a zip archive", "utf-8");
    await expect(extractText(notADocx, "docx")).rejects.toThrow();
  });
});
