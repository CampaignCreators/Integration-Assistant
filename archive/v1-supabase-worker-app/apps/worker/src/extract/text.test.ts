import { describe, expect, it } from "vitest";
import { extractText, parseTranscript, uploadTypeFromFilename } from "./text.js";

describe("parseTranscript", () => {
  it("strips WEBVTT headers, cue ids, and timestamps", () => {
    const vtt = [
      "WEBVTT",
      "",
      "1",
      "00:00:01.000 --> 00:00:04.500",
      "So we're using Stripe for all our billing.",
      "",
      "2",
      "00:00:04.500 --> 00:00:08.000",
      "And you want that in HubSpot?",
    ].join("\n");

    expect(parseTranscript(vtt, "vtt")).toBe(
      "So we're using Stripe for all our billing.\nAnd you want that in HubSpot?"
    );
  });

  it("keeps speaker names from voice tags and strips other markup", () => {
    const vtt = [
      "WEBVTT",
      "",
      "00:00:01.000 --> 00:00:03.000",
      "<v Dana Howerton>We need two-way sync.</v>",
      "",
      "00:00:03.000 --> 00:00:05.000",
      "<i>inaudible</i> for contacts only",
    ].join("\n");

    expect(parseTranscript(vtt, "vtt")).toBe(
      "Dana Howerton: We need two-way sync.\ninaudible for contacts only"
    );
  });

  it("parses SRT comma-separated timestamps", () => {
    const srt = [
      "1",
      "00:00:02,000 --> 00:00:05,000",
      "Their system is called ServiceTitan.",
      "",
      "2",
      "00:00:05,000 --> 00:00:07,250",
      "Does it have an API?",
    ].join("\r\n");

    expect(parseTranscript(srt, "srt")).toBe(
      "Their system is called ServiceTitan.\nDoes it have an API?"
    );
  });

  it("collapses repeated lines from rolling auto-captions", () => {
    const vtt = [
      "WEBVTT",
      "",
      "00:00:01.000 --> 00:00:02.000",
      "we need contacts synced",
      "",
      "00:00:02.000 --> 00:00:03.000",
      "we need contacts synced",
      "",
      "00:00:03.000 --> 00:00:04.000",
      "and companies too",
    ].join("\n");

    expect(parseTranscript(vtt, "vtt")).toBe("we need contacts synced\nand companies too");
  });

  it("drops NOTE and STYLE blocks", () => {
    const vtt = [
      "WEBVTT",
      "",
      "NOTE recorded via Fathom",
      "",
      "00:00:01.000 --> 00:00:02.000",
      "Real content here.",
    ].join("\n");

    expect(parseTranscript(vtt, "vtt")).toBe("Real content here.");
  });

  it("handles short mm:ss timestamps", () => {
    const vtt = ["WEBVTT", "", "00:01.000 --> 00:04.000", "Short form timestamps."].join(
      "\n"
    );
    expect(parseTranscript(vtt, "vtt")).toBe("Short form timestamps.");
  });
});

describe("extractText", () => {
  it("reads plain text and markdown as-is", async () => {
    const buffer = Buffer.from("  # Discovery notes\nStripe → HubSpot  ", "utf-8");
    await expect(extractText(buffer, "txt")).resolves.toBe(
      "# Discovery notes\nStripe → HubSpot"
    );
    await expect(extractText(buffer, "md")).resolves.toBe(
      "# Discovery notes\nStripe → HubSpot"
    );
  });

  it("routes transcript formats through the cue parser", async () => {
    const vtt = Buffer.from(
      "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nHello there.",
      "utf-8"
    );
    await expect(extractText(vtt, "vtt")).resolves.toBe("Hello there.");
  });
});

describe("uploadTypeFromFilename", () => {
  it("accepts the supported discovery formats", () => {
    expect(uploadTypeFromFilename("call.VTT")).toBe("vtt");
    expect(uploadTypeFromFilename("notes.md")).toBe("md");
    expect(uploadTypeFromFilename("Requirements v2.final.docx")).toBe("docx");
  });

  it("rejects anything else", () => {
    expect(uploadTypeFromFilename("recording.mp4")).toBeNull();
    expect(uploadTypeFromFilename("noextension")).toBeNull();
    expect(uploadTypeFromFilename("archive.zip")).toBeNull();
  });
});
