"use client";

import { useEffect, useState } from "react";
import { Documents } from "@/components/documents";
import { Intake } from "@/components/intake";
import { MappingTableEditor } from "@/components/mapping-table";
import { Questions } from "@/components/questions";
import { RunsBar } from "@/components/runs-bar";
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
import { useRunSync } from "@/lib/use-run-sync";

/**
 * The whole app: describe the integration, review the mapping it drafts, confirm
 * it, download the two documents.
 *
 * With Supabase configured, work is saved as a run you can reopen from any
 * browser. Without it, the same flow runs against localStorage — which is what
 * keeps the app usable with nothing but `npm run dev`.
 */
export function Workspace({
  persistence,
  email,
}: {
  persistence: boolean;
  email: string | null;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { runs, saveState, refresh, create, markSynced } = useRunSync({
    enabled: persistence,
    draft,
    onDraftId: (id) => setDraft((current) => ({ ...current, id })),
  });

  useEffect(() => {
    setDraft(loadDraft());
    setLoaded(true);
  }, []);

  // localStorage is kept up to date either way: it is the only store when there
  // is no Supabase, and a crash-safety net when there is.
  useEffect(() => {
    if (loaded) saveDraft(draft);
  }, [draft, loaded]);

  function patch(update: Partial<Draft>) {
    setDraft((current) => ({ ...current, ...update }));
  }

  /** Ensures the run exists before anything needs to reference it. */
  async function ensureRun(next: Draft): Promise<string | null> {
    if (!persistence) return null;
    if (next.id) return next.id;
    return create(next);
  }

  async function analyze(answers: { question: string; answer: string }[] = draft.answers) {
    setBusy(true);
    setError(null);
    try {
      await ensureRun(draft);
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

  async function openRun(id: string) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/runs/${id}`);
      const data = (await response.json()) as { draft?: Draft; error?: string };
      if (!response.ok || !data.draft) {
        setError(data.error ?? "Could not open that run.");
        return;
      }
      setDraft(data.draft);
      markSynced(data.draft);
    } catch {
      setError("Could not open that run.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteRun(id: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/runs/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Could not delete that run.");
        return;
      }
      clearDraft();
      setDraft(EMPTY_DRAFT);
      await refresh();
    } catch {
      setError("Could not delete that run.");
    } finally {
      setBusy(false);
    }
  }

  function newRun() {
    clearDraft();
    setDraft(EMPTY_DRAFT);
    setError(null);
  }

  /** Uploads need a run id first, so the original can be filed against it. */
  async function beforeUpload(): Promise<string | null> {
    return ensureRun(draft);
  }

  const drafted = draft.mapping !== null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Integration Assistant</h1>
        <p className="mt-1 text-sm text-ink">
          Turn discovery material into a HubSpot data mapping, an integration brief, and a
          developer handoff.
        </p>
      </header>

      {persistence ? (
        <RunsBar
          runs={runs}
          currentId={draft.id}
          saveState={saveState}
          busy={busy}
          email={email}
          onOpen={(id) => void openRun(id)}
          onNew={newRun}
          onDelete={(id) => void deleteRun(id)}
          onSignOut={() => {
            window.location.href = "/api/sign-out";
          }}
        />
      ) : null}

      {draft.demo ? (
        <div className="mb-6">
          <Notice tone="warn">
            <strong>Demo mode.</strong> No Anthropic API key is configured, so this output is
            placeholder text and is labelled as such throughout. Set{" "}
            <code className="font-mono text-xs">ANTHROPIC_API_KEY</code> and restart for real
            analysis.
          </Notice>
        </div>
      ) : null}

      <div className="space-y-5">
        <Card
          step={1}
          title="Describe the integration"
          hint="Two things are required: the software and the use case. Everything else helps but is optional."
          done={drafted}
        >
          <Intake
            targetSoftware={draft.targetSoftware}
            useCase={draft.useCase}
            notes={draft.notes}
            documents={draft.documents}
            disabled={busy}
            runId={draft.id}
            onBeforeUpload={beforeUpload}
            onChange={patch}
          />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button disabled={busy || !canAnalyze(draft)} onClick={() => void analyze([])}>
              {drafted ? "Draft the mapping again" : "Draft the mapping"}
            </Button>
            {busy && !draft.pendingQuestions ? (
              <Spinner label="Reading everything and drafting the mapping — this can take a minute…" />
            ) : null}
            {!canAnalyze(draft) ? (
              <span className="text-xs text-muted">
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
              onConfirm={() => patch({ mapping: pruneEmptyRows(draft.mapping!), confirmed: true })}
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

      <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5 text-xs text-muted">
        <span>
          {persistence
            ? "Runs are saved to Supabase against your account. Uploaded files are kept in private storage."
            : "This draft is kept in this browser only. Nothing is stored on a server."}
        </span>
        {!persistence ? (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Clear this draft and start fresh?")) newRun();
            }}
          >
            Start over
          </Button>
        ) : null}
      </footer>
    </main>
  );
}
