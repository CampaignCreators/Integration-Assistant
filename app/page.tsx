"use client";

import { useEffect, useState } from "react";
import { Documents } from "@/components/documents";
import { Intake } from "@/components/intake";
import { MappingTableEditor } from "@/components/mapping-table";
import { Questions } from "@/components/questions";
import { Button, Card, Notice, Spinner } from "@/components/ui";
import { pruneEmptyRows } from "@/lib/mapping";
import type { AnalyzeResult, DocumentKind, MappingTable } from "@/lib/schemas";
import {
  EMPTY_DRAFT,
  canAnalyze,
  clearDraft,
  loadDraft,
  saveDraft,
  type Draft,
} from "@/lib/session";

/**
 * The whole app: describe the integration, review the mapping it drafts, confirm
 * it, download the two documents.
 *
 * State lives here and is mirrored to localStorage — there is no database and no
 * sign-in, which is what keeps this runnable with one command.
 */
export default function Page() {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(loadDraft());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveDraft(draft);
  }, [draft, loaded]);

  function patch(update: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...update }));
  }

  async function analyze(answers: { question: string; answer: string }[] = draft.answers) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_software: draft.targetSoftware,
          use_case: draft.useCase,
          notes: draft.notes,
          documents: draft.documents,
          answers,
          round: draft.round,
        }),
      });
      const data = (await response.json()) as AnalyzeResult | { error: string };

      if (!response.ok || "error" in data) {
        setError("error" in data ? data.error : "Something went wrong.");
        return;
      }

      if (data.kind === "questions") {
        patch({
          answers,
          pendingQuestions: data.questions.questions,
          questionReason: data.questions.reason,
          round: draft.round + 1,
          demo: data.demo,
          mapping: null,
          confirmed: false,
        });
        return;
      }

      patch({
        answers,
        pendingQuestions: null,
        questionReason: null,
        mapping: data.mapping,
        confirmed: false,
        demo: data.demo,
      });
    } catch {
      setError("Could not reach the app. Is it still running?");
    } finally {
      setBusy(false);
    }
  }

  async function downloadDocument(kind: DocumentKind): Promise<string | null> {
    if (!draft.mapping) return "Confirm the mapping first.";
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          target_software: draft.targetSoftware,
          use_case: draft.useCase,
          notes: draft.notes,
          documents: draft.documents,
          answers: draft.answers,
          mapping: draft.mapping,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        return data?.error ?? "Could not generate the document.";
      }

      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] ?? `${kind}.docx`;
      link.click();
      URL.revokeObjectURL(url);
      return null;
    } catch {
      return "Could not reach the app. Is it still running?";
    }
  }

  const step3Ready = draft.mapping !== null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Integration Assistant</h1>
        <p className="mt-1 text-sm text-slate-600">
          Turn discovery material into a HubSpot data mapping, an integration brief, and a
          developer handoff.
        </p>
      </header>

      {draft.demo ? (
        <div className="mb-6">
          <Notice tone="warn">
            <strong>Demo mode.</strong> No Anthropic API key is configured, so this output is
            placeholder text and is labelled as such throughout. Set{" "}
            <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> in{" "}
            <code className="font-mono text-xs">.env.local</code> and restart for real analysis.
          </Notice>
        </div>
      ) : null}

      <div className="space-y-5">
        <Card
          step={1}
          title="Describe the integration"
          hint="Two things are required: the software and the use case. Everything else helps but is optional."
          done={step3Ready}
        >
          <Intake
            targetSoftware={draft.targetSoftware}
            useCase={draft.useCase}
            notes={draft.notes}
            documents={draft.documents}
            disabled={busy}
            onChange={patch}
          />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button disabled={busy || !canAnalyze(draft)} onClick={() => void analyze([])}>
              {draft.mapping ? "Start over with these details" : "Draft the mapping"}
            </Button>
            {busy && !draft.pendingQuestions ? (
              <Spinner label="Reading everything and drafting the mapping — this can take a minute…" />
            ) : null}
            {!canAnalyze(draft) ? (
              <span className="text-xs text-slate-500">
                Name the software and describe the use case to continue.
              </span>
            ) : null}
          </div>

          {error ? (
            <div className="mt-4">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}
        </Card>

        {draft.pendingQuestions ? (
          <Card
            step={2}
            title="A few things are missing"
            hint="Answer these and the mapping will be drafted straight after."
          >
            <Questions
              reason={draft.questionReason ?? ""}
              questions={draft.pendingQuestions}
              busy={busy}
              onSubmit={(answers) => void analyze([...draft.answers, ...answers])}
            />
          </Card>
        ) : null}

        {draft.mapping ? (
          <Card
            step={draft.pendingQuestions ? 3 : 2}
            title="Review the mapping"
            hint="Edit anything that looks wrong, then confirm the logic."
            done={draft.confirmed}
          >
            <MappingTableEditor
              mapping={draft.mapping}
              confirmed={draft.confirmed}
              busy={busy}
              onChange={(mapping: MappingTable) => patch({ mapping })}
              onConfirm={() =>
                patch({ mapping: pruneEmptyRows(draft.mapping!), confirmed: true })
              }
              onReopen={() => patch({ confirmed: false })}
            />
          </Card>
        ) : null}

        {draft.confirmed && draft.mapping ? (
          <Card
            step={draft.pendingQuestions ? 4 : 3}
            title="Documents"
            hint="Generated from the table you confirmed."
          >
            <Documents onDownload={downloadDocument} />
          </Card>
        ) : null}
      </div>

      <footer className="mt-10 flex items-center justify-between border-t border-slate-200 pt-5 text-xs text-slate-500">
        <span>Your draft is kept in this browser only. Nothing is stored on a server.</span>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => {
            if (!window.confirm("Clear this draft and start fresh?")) return;
            clearDraft();
            setDraft(EMPTY_DRAFT);
            setError(null);
          }}
        >
          Start over
        </Button>
      </footer>
    </main>
  );
}
