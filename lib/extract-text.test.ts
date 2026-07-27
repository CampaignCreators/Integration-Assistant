import { Document, Packer, Paragraph } from "docx";
import { describe, expect, it } from "vitest";
import { UnsupportedFileError, extensionOf, extractText, stripCaptionTiming } from "./extract-text";
import { MAX_FILE_BYTES } from "./schemas";

const encode = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

describe("extractText", () => {
  it("reads plain text and markdown", async () => {
    expect(await extractText("notes.txt", encode("  hello  "))).toBe("hello");
    expect(await extractText("notes.md", encode("# Title\n\nBody"))).toBe("# Title\n\nBody");
  });

  it("reads a real .docx", async () => {
    const document = new Document({
      sections: [{ children: [new Paragraph("Discovery call with Northwind")] }],
    });
    const buffer = await Packer.toBuffer(document);
    const text = await extractText(
      "call.docx",
      buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
    );
    expect(text).toContain("Discovery call with Northwind");
  });

  it("refuses a file type it cannot read, by name", async () => {
    await expect(extractText("recording.mp4", encode("x"))).rejects.toBeInstanceOf(
      UnsupportedFileError
    );
    await expect(extractText("recording.mp4", encode("x"))).rejects.toThrow(/not a supported/i);
  });

  it("refuses a file that is too large before trying to parse it", async () => {
    const oversized = new ArrayBuffer(MAX_FILE_BYTES + 1);
    await expect(extractText("huge.txt", oversized)).rejects.toThrow(/larger than/i);
  });

  it("is case-insensitive about extensions", async () => {
    expect(await extractText("NOTES.TXT", encode("ok"))).toBe("ok");
  });

  it("strips timing out of caption files", async () => {
    const vtt = [
      "WEBVTT",
      "",
      "1",
      "00:00:01.000 --> 00:00:04.000",
      "Marcus: A call comes in.",
      "",
      "2",
      "00:00:04.000 --> 00:00:07.500",
      "Priya: And I retype it into HubSpot.",
      "",
    ].join("\n");
    const text = await extractText("call.vtt", encode(vtt));
    expect(text).toBe("Marcus: A call comes in.\nPriya: And I retype it into HubSpot.");
  });
});

describe("stripCaptionTiming", () => {
  it("handles the comma timestamps used by .srt", () => {
    const srt = "1\n00:00:01,000 --> 00:00:04,000\nHello there\n";
    expect(stripCaptionTiming(srt)).toBe("Hello there");
  });

  it("drops repeated cue text rather than saying it twice", () => {
    const vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nSame line\n\n00:00:02.000 --> 00:00:03.000\nSame line\n";
    expect(stripCaptionTiming(vtt)).toBe("Same line");
  });

  it("keeps a line that merely contains numbers", () => {
    expect(stripCaptionTiming("We have 12000 customers")).toBe("We have 12000 customers");
  });

  it("drops cue-number lines", () => {
    expect(stripCaptionTiming("42\nReal content")).toBe("Real content");
  });

  it("drops VTT metadata blocks", () => {
    expect(stripCaptionTiming("NOTE this is a note\nSTYLE\nReal content")).toBe("Real content");
  });
});

describe("extensionOf", () => {
  it("returns the lowercase extension, or nothing when there isn't one", () => {
    expect(extensionOf("a/b/Call Notes.DOCX")).toBe(".docx");
    expect(extensionOf("Makefile")).toBe("");
    expect(extensionOf("archive.tar.gz")).toBe(".gz");
  });
});
