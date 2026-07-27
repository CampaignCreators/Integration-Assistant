"use client";

import { useRef, useState } from "react";
import { ACCEPTED_EXTENSIONS, MAX_FILES, type SourceDoc } from "@/lib/schemas";
import { Button, Field, Notice, Spinner, inputClass } from "./ui";

/**
 * Step 1 and 2: the supporting material, and the two questions every run needs
 * answered — what the software is, and what it should do.
 */
export function Intake({
  targetSoftware,
  useCase,
  notes,
  documents,
  disabled,
  runId,
  onBeforeUpload,
  onChange,
}: {
  targetSoftware: string;
  useCase: string;
  notes: string;
  documents: SourceDoc[];
  disabled: boolean;
  /** Set once the run is saved; the original files are filed against it. */
  runId: string | null;
  /** Creates the run if it does not exist yet, so uploads have somewhere to go. */
  onBeforeUpload: () => Promise<string | null>;
  onChange: (patch: {
    targetSoftware?: string;
    useCase?: string;
    notes?: string;
    documents?: SourceDoc[];
  }) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [failures, setFailures] = useState<{ name: string; error: string }[]>([]);
  const fileInput = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const room = MAX_FILES - documents.length;
    if (room <= 0) {
      setFailures([{ name: "", error: `You can attach up to ${MAX_FILES} files.` }]);
      return;
    }

    setUploading(true);
    setFailures([]);

    // Saved runs keep the original file, so the run has to exist first.
    const id = runId ?? (await onBeforeUpload());

    const form = new FormData();
    for (const file of Array.from(files).slice(0, room)) form.append("files", file);
    if (id) form.append("run_id", id);

    try {
      const response = await fetch("/api/extract", { method: "POST", body: form });
      const data = (await response.json()) as {
        documents?: SourceDoc[];
        failures?: { name: string; error: string }[];
        error?: string;
      };
      if (!response.ok) {
        setFailures([{ name: "", error: data.error ?? "Upload failed." }]);
        return;
      }
      // Re-uploading the same filename replaces it rather than duplicating.
      const incoming = data.documents ?? [];
      const kept = documents.filter((d) => !incoming.some((i) => i.name === d.name));
      onChange({ documents: [...kept, ...incoming] });
      setFailures(data.failures ?? []);
    } catch {
      setFailures([{ name: "", error: "Upload failed. Is the app still running?" }]);
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      <Field
        label="What software should connect to HubSpot?"
        hint="The other system in the integration — e.g. ServiceTitan, Shopify, NetSuite."
      >
        <input
          className={inputClass}
          value={targetSoftware}
          disabled={disabled}
          placeholder="ServiceTitan"
          onChange={(event) => onChange({ targetSoftware: event.target.value })}
        />
      </Field>

      <Field
        label="What should the integration do?"
        hint="Describe it the way you'd explain it to the client. What moves, which way, and why it matters."
      >
        <textarea
          className={`${inputClass} min-h-28`}
          value={useCase}
          disabled={disabled}
          placeholder="When a customer is created in ServiceTitan, they should appear in HubSpot as a contact so sales can follow up. Job history should be visible on the contact."
          onChange={(event) => onChange({ useCase: event.target.value })}
        />
      </Field>

      <Field
        label="Anything else worth knowing?"
        hint="Optional. Paste notes, requirements, or a snippet of a call — anything not in a file."
      >
        <textarea
          className={`${inputClass} min-h-24`}
          value={notes}
          disabled={disabled}
          placeholder="Roughly 12,000 customers. No in-house developer. About 30% of residential customers have no email address."
          onChange={(event) => onChange({ notes: event.target.value })}
        />
      </Field>

      <div>
        <span className="text-sm font-medium text-slate-800">Supporting documents</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          Optional. Call transcripts, notes, requirement docs ({ACCEPTED_EXTENSIONS.join(", ")}).
          Only the text is used for the analysis.
        </span>

        <div className="mt-2 flex items-center gap-3">
          <input
            ref={fileInput}
            type="file"
            multiple
            disabled={disabled || uploading}
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={(event) => void upload(event.target.files)}
            className="block w-full cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-sm file:text-white"
          />
          {uploading ? <Spinner label="Reading…" /> : null}
        </div>

        {documents.length > 0 ? (
          <ul className="mt-3 space-y-1.5">
            {documents.map((doc) => (
              <li
                key={doc.name}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="truncate">
                  {doc.name}{" "}
                  <span className="text-slate-500">
                    · {doc.text.length.toLocaleString()} characters read
                  </span>
                </span>
                <Button
                  variant="ghost"
                  disabled={disabled}
                  onClick={() =>
                    onChange({ documents: documents.filter((d) => d.name !== doc.name) })
                  }
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        ) : null}

        {failures.length > 0 ? (
          <div className="mt-3">
            <Notice tone="warn">
              <ul className="space-y-1">
                {failures.map((failure, index) => (
                  <li key={index}>
                    {failure.name ? <strong>{failure.name}: </strong> : null}
                    {failure.error}
                  </li>
                ))}
              </ul>
            </Notice>
          </div>
        ) : null}
      </div>
    </div>
  );
}
