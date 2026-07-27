import type { MappingTable, Question, SourceDoc } from "./schemas";

/**
 * The draft, held in the browser.
 *
 * There is no database on purpose: a single-user internal tool does not need one,
 * and the uploaded material often contains client PII that is better off never
 * being stored server-side. localStorage means a refresh or a closed laptop lid
 * doesn't lose an hour of work.
 */

export interface Draft {
  targetSoftware: string;
  useCase: string;
  notes: string;
  documents: SourceDoc[];
  round: number;
  pendingQuestions: Question[] | null;
  questionReason: string | null;
  answers: { question: string; answer: string }[];
  mapping: MappingTable | null;
  confirmed: boolean;
  demo: boolean;
}

export const EMPTY_DRAFT: Draft = {
  targetSoftware: "",
  useCase: "",
  notes: "",
  documents: [],
  round: 0,
  pendingQuestions: null,
  questionReason: null,
  answers: [],
  mapping: null,
  confirmed: false,
  demo: false,
};

const KEY = "integration-assistant.draft.v1";

export function loadDraft(): Draft {
  if (typeof window === "undefined") return EMPTY_DRAFT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_DRAFT;
    // Spread over the default so a draft saved by an older build still opens.
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch {
    return EMPTY_DRAFT;
  }
}

export function saveDraft(draft: Draft): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Quota exceeded — a very large transcript. The draft still works in memory.
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
}

/** Enough to attempt a draft: the two things the user is asked for. */
export function canAnalyze(draft: Draft): boolean {
  return draft.targetSoftware.trim().length > 0 && draft.useCase.trim().length > 0;
}
