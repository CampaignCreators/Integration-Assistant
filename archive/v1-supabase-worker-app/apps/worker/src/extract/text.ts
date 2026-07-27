import mammoth from "mammoth";
import { extractText as unpdfExtractText, getDocumentProxy } from "unpdf";
import type { UploadType } from "@cc/shared";

/**
 * Extracts plain text from an uploaded discovery file.
 * Formats per spec §5.1.1: .txt, .md, .docx, .pdf, .vtt, .srt.
 */
export async function extractText(
  buffer: Buffer,
  type: UploadType
): Promise<string> {
  switch (type) {
    case "txt":
    case "md":
      return buffer.toString("utf-8").trim();
    case "docx": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    }
    case "pdf": {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await unpdfExtractText(pdf, { mergePages: true });
      return text.trim();
    }
    case "vtt":
      return parseTranscript(buffer.toString("utf-8"), "vtt");
    case "srt":
      return parseTranscript(buffer.toString("utf-8"), "srt");
  }
}

const TIMESTAMP_LINE =
  /^\s*(?:\d+\s*$)|(?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{3}\s*-->\s*(?:\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{3}.*$/;

/**
 * Converts a WebVTT/SRT transcript into readable text: strips cue indices,
 * timestamps, and inline voice tags; keeps "Speaker: line" structure when the
 * cue provides it; collapses consecutive duplicate lines (common in
 * auto-captions).
 */
export function parseTranscript(raw: string, format: "vtt" | "srt"): string {
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];

  for (let line of lines) {
    if (format === "vtt" && /^(WEBVTT|NOTE|STYLE|REGION)\b/.test(line.trim())) {
      continue;
    }
    if (line.trim() === "" || TIMESTAMP_LINE.test(line)) {
      continue;
    }
    // <v Speaker Name>text</v> → "Speaker Name: text"; strip other tags.
    line = line
      .replace(/<v\s+([^>]+)>/gi, "$1: ")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (line === "") continue;
    if (out.length > 0 && out[out.length - 1] === line) continue;
    out.push(line);
  }

  return out.join("\n").trim();
}

export function uploadTypeFromFilename(filename: string): UploadType | null {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "txt":
    case "md":
    case "docx":
    case "pdf":
    case "vtt":
    case "srt":
      return ext;
    default:
      return null;
  }
}
