import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES } from "./schemas";

/**
 * Pulls plain text out of an uploaded file.
 *
 * Transcripts arrive as .vtt or .srt more often than anything else, so their
 * timing lines are stripped — left in, they eat a large share of the prompt and
 * tell the model nothing.
 */

export class UnsupportedFileError extends Error {}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export async function extractText(
  filename: string,
  bytes: ArrayBuffer
): Promise<string> {
  if (bytes.byteLength > MAX_FILE_BYTES) {
    throw new UnsupportedFileError(
      `${filename} is larger than ${Math.round(MAX_FILE_BYTES / 1024 / 1024)} MB.`
    );
  }

  const extension = extensionOf(filename);
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    throw new UnsupportedFileError(
      `${filename} is not a supported file type. Use ${ACCEPTED_EXTENSIONS.join(", ")}.`
    );
  }

  const buffer = Buffer.from(bytes);

  if (extension === ".docx") {
    const mammoth = await import("mammoth");
    const { value } = await mammoth.extractRawText({ buffer });
    return value.trim();
  }

  if (extension === ".pdf") {
    const { extractText: extractPdfText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractPdfText(pdf, { mergePages: true });
    return text.trim();
  }

  const text = buffer.toString("utf8");
  if (extension === ".vtt" || extension === ".srt") return stripCaptionTiming(text);
  return text.trim();
}

/**
 * Turns caption files into readable dialogue: drops cue numbers, timestamps and
 * WEBVTT headers, and collapses the repeated speaker labels some tools emit.
 */
export function stripCaptionTiming(raw: string): string {
  const lines = raw.split(/\r?\n/);
  const kept: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^WEBVTT/i.test(trimmed)) continue;
    if (/^\d+$/.test(trimmed)) continue;
    // 00:00:01.000 --> 00:00:04.000  (also the comma form used by .srt)
    if (/^[\d:.,]+\s*-->\s*[\d:.,]+/.test(trimmed)) continue;
    if (/^(NOTE|STYLE|REGION)\b/.test(trimmed)) continue;

    const previous = kept[kept.length - 1];
    if (previous === trimmed) continue; // duplicated cue text
    kept.push(trimmed);
  }

  return kept.join("\n");
}
