import { NextResponse } from "next/server";
import { UnsupportedFileError, extractText } from "@/lib/extract-text";
import { MAX_FILES } from "@/lib/schemas";

/**
 * Turns uploaded files into plain text and hands it straight back.
 *
 * Nothing is stored server-side: the extracted text lives in the browser with
 * the rest of the draft, which is why this app needs no database and no
 * accounts. Discovery material often contains client PII, and text the server
 * never keeps is text that cannot leak from it.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "No files received." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json(
      { error: `Attach at most ${MAX_FILES} files at a time.` },
      { status: 400 }
    );
  }

  const documents: { name: string; text: string }[] = [];
  const failures: { name: string; error: string }[] = [];

  for (const file of files) {
    try {
      const text = await extractText(file.name, await file.arrayBuffer());
      if (!text.trim()) {
        failures.push({ name: file.name, error: "No readable text found in this file." });
        continue;
      }
      documents.push({ name: file.name, text });
    } catch (error) {
      // One unreadable file should not lose the others.
      failures.push({
        name: file.name,
        error:
          error instanceof UnsupportedFileError
            ? error.message
            : "Could not read this file.",
      });
      if (!(error instanceof UnsupportedFileError)) console.error("extract failed", error);
    }
  }

  return NextResponse.json({ documents, failures });
}
