"use client";

import { useState } from "react";
import type { DocumentKind } from "@/lib/schemas";
import { Button, Notice, Spinner } from "./ui";

const DOCUMENTS: { kind: DocumentKind; title: string; description: string }[] = [
  {
    kind: "brief",
    title: "Integration Brief",
    description:
      "For the client: what the integration achieves, what is in scope, what they need to provide.",
  },
  {
    kind: "handoff",
    title: "Developer Handoff",
    description:
      "For whoever builds it: the confirmed mapping object by object, transforms, edge cases, and what is still unresolved.",
  },
];

/** Step 4: the two deliverables, generated from the confirmed table on demand. */
export function Documents({
  onDownload,
}: {
  onDownload: (kind: DocumentKind) => Promise<string | null>;
}) {
  const [busy, setBusy] = useState<DocumentKind | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(kind: DocumentKind) {
    setBusy(kind);
    setError(null);
    const failure = await onDownload(kind);
    if (failure) setError(failure);
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      {DOCUMENTS.map((document) => (
        <div
          key={document.kind}
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line p-4"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy">{document.title}</p>
            <p className="mt-0.5 text-xs text-muted">{document.description}</p>
          </div>
          <div className="flex items-center gap-3">
            {busy === document.kind ? <Spinner label="Writing…" /> : null}
            <Button
              variant="secondary"
              disabled={busy !== null}
              onClick={() => void download(document.kind)}
            >
              Download .docx
            </Button>
          </div>
        </div>
      ))}

      {error ? <Notice tone="error">{error}</Notice> : null}

      <p className="text-xs text-muted">
        Each download is written from the table you confirmed, so edits you made are
        reflected. Generating a document takes a few seconds.
      </p>
    </div>
  );
}
