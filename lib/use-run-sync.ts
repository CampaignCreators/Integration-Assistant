"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Draft } from "./session";
import type { RunSummary } from "./runs";

export type SaveState = "idle" | "saving" | "saved" | "error";

/** Long enough that typing doesn't cause a save per keystroke. */
const DEBOUNCE_MS = 1200;

/**
 * Keeps a draft in step with its saved row.
 *
 * Autosave rather than a save button: the previous version lost work often enough
 * that people stopped trusting it, and a button is one more thing to forget. The
 * debounce is what stops that becoming a write per keystroke.
 *
 * Does nothing at all when Supabase isn't configured — the draft then lives only
 * in localStorage, which is the app's zero-setup mode.
 */
export function useRunSync({
  enabled,
  draft,
  onDraftId,
}: {
  enabled: boolean;
  draft: Draft;
  onDraftId: (id: string) => void;
}) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef<string>("");

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const response = await fetch("/api/runs");
      if (!response.ok) return;
      const data = (await response.json()) as { runs?: RunSummary[] };
      setRuns(data.runs ?? []);
    } catch {
      // Offline or signed out; the list is a convenience, not the draft itself.
    }
  }, [enabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Creates the row, so uploads and saves have somewhere to go. */
  const create = useCallback(
    async (initial: Draft): Promise<string | null> => {
      if (!enabled) return null;
      try {
        const response = await fetch("/api/runs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft: initial }),
        });
        if (!response.ok) return null;
        const data = (await response.json()) as { id?: string };
        if (data.id) {
          onDraftId(data.id);
          void refresh();
          return data.id;
        }
      } catch {
        setSaveState("error");
      }
      return null;
    },
    [enabled, onDraftId, refresh]
  );

  // Debounced save whenever the draft changes in a way worth persisting.
  useEffect(() => {
    if (!enabled || !draft.id) return;

    const serialised = JSON.stringify({ ...draft, id: undefined });
    if (serialised === lastSaved.current) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSaveState("saving");
      try {
        const response = await fetch(`/api/runs/${draft.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft }),
        });
        if (!response.ok) {
          setSaveState("error");
          return;
        }
        lastSaved.current = serialised;
        setSaveState("saved");
        void refresh();
      } catch {
        setSaveState("error");
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [draft, enabled, refresh]);

  /** Marks a freshly opened run as already in sync, so it isn't re-saved at once. */
  const markSynced = useCallback((opened: Draft) => {
    lastSaved.current = JSON.stringify({ ...opened, id: undefined });
    setSaveState("idle");
  }, []);

  return { runs, saveState, refresh, create, markSynced };
}
