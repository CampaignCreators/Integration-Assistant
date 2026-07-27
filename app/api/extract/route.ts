import { NextResponse } from "next/server";
import { UnsupportedFileError, extractText } from "@/lib/extract-text";
import { MAX_FILES, type SourceDoc } from "@/lib/schemas";
import { uploadPath } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

/**
 * Turns uploaded files into plain text.
 *
 * The text goes back to the browser either way. When Supabase is configured and
 * the run has been saved, the original file is also kept in Storage so a colleague
 * opening the run later can read the source, not just the extract.
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

  const runId = String(form.get("run_id") ?? "").trim() || null;
  const supabase = runId ? await createClient() : null;
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;

  const documents: SourceDoc[] = [];
  const failures: { name: string; error: string }[] = [];

  for (const file of files) {
    try {
      const bytes = await file.arrayBuffer();
      const text = await extractText(file.name, bytes);
      if (!text.trim()) {
        failures.push({ name: file.name, error: "No readable text found in this file." });
        continue;
      }

      let storagePath: string | null = null;
      if (supabase && user && runId) {
        const path = uploadPath(user.id, runId, file.name);
        const { error } = await supabase.storage
          .from("uploads")
          .upload(path, bytes, { contentType: file.type || undefined, upsert: true });
        if (error) {
          // Keeping the original is a convenience; losing it must not lose the
          // text we already extracted.
          console.error("storing the original failed", error);
        } else {
          storagePath = path;
        }
      }

      documents.push({ name: file.name, text, storage_path: storagePath });
    } catch (error) {
      // One unreadable file should not lose the others.
      failures.push({
        name: file.name,
        error:
          error instanceof UnsupportedFileError ? error.message : "Could not read this file.",
      });
      if (!(error instanceof UnsupportedFileError)) console.error("extract failed", error);
    }
  }

  return NextResponse.json({ documents, failures });
}
