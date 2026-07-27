import { describe, expect, it } from "vitest";
import { demoMapping } from "./demo";
import { draftToRow, formatUpdatedAt, rowToDraft, rowToSummary, runTitle } from "./runs";
import { safeFilename, supabaseConfig, supabaseEnabled, uploadPath } from "./supabase/config";
import { EMPTY_DRAFT, type Draft } from "./session";

const draft: Draft = {
  ...EMPTY_DRAFT,
  id: "run-1",
  targetSoftware: "ServiceTitan",
  useCase: "Customers into HubSpot",
  notes: "12,000 customers",
  documents: [{ name: "call.txt", text: "transcript", storage_path: "u/r/call.txt" }],
  answers: [{ question: "Direction?", answer: "Into HubSpot" }],
  pendingQuestions: [{ question: "Match key?", why: "Duplicates", suggestions: ["Email"] }],
  questionReason: "Need the match key",
  mapping: demoMapping("ServiceTitan"),
  confirmed: true,
  round: 1,
  demo: true,
};

describe("supabaseConfig", () => {
  it("is off when either value is missing", () => {
    expect(supabaseEnabled({})).toBe(false);
    expect(supabaseEnabled({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" })).toBe(false);
    expect(supabaseEnabled({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "key" })).toBe(false);
  });

  it("is off for a value that isn't a URL, rather than failing later", () => {
    expect(
      supabaseEnabled({
        NEXT_PUBLIC_SUPABASE_URL: "your-project-url-here",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "key",
      })
    ).toBe(false);
  });

  it("treats whitespace as absent, which is what a half-filled .env looks like", () => {
    expect(
      supabaseEnabled({ NEXT_PUBLIC_SUPABASE_URL: "  ", NEXT_PUBLIC_SUPABASE_ANON_KEY: "  " })
    ).toBe(false);
  });

  it("is on with both values present", () => {
    const config = supabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: " https://abc.supabase.co ",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: " anon-key ",
    });
    expect(config).toEqual({ url: "https://abc.supabase.co", anonKey: "anon-key" });
  });
});

describe("uploadPath", () => {
  it("puts the owner's id first, which is what the storage policy checks", () => {
    expect(uploadPath("user-1", "run-2", "call.txt")).toBe("user-1/run-2/call.txt");
  });

  it("keeps a filename from breaking out of its folder", () => {
    const path = uploadPath("user-1", "run-2", "../../etc/passwd");
    expect(path.split("/")).toHaveLength(3);
    expect(path).not.toContain("..");
  });

  it("strips characters that do not belong in a storage key", () => {
    expect(safeFilename("Discovery Call — Northwind (final)!.docx")).toBe(
      "Discovery-Call-Northwind-final.docx"
    );
  });

  it("never returns an empty name", () => {
    expect(safeFilename("///")).toBe("upload");
    expect(safeFilename("")).toBe("upload");
  });

  it("keeps long names bounded", () => {
    expect(safeFilename(`${"a".repeat(400)}.txt`).length).toBeLessThanOrEqual(120);
  });
});

describe("runTitle", () => {
  it("prefers what the user typed", () => {
    expect(runTitle({ title: "Northwind", targetSoftware: "ServiceTitan" })).toBe("Northwind");
  });

  it("falls back to the software, then to something generic", () => {
    expect(runTitle({ title: "", targetSoftware: "ServiceTitan" })).toBe("ServiceTitan → HubSpot");
    expect(runTitle({ title: "  ", targetSoftware: "  " })).toBe("Untitled run");
  });
});

describe("draft round-tripping", () => {
  it("survives a save and a reload unchanged", () => {
    const row = { id: "run-1", updated_at: "2026-07-27T12:00:00Z", ...draftToRow(draft) };
    const restored = rowToDraft(row);
    expect(restored).toEqual({ ...draft, title: "ServiceTitan → HubSpot" });
  });

  it("keeps a pending question round across a reload", () => {
    const row = { id: "run-1", updated_at: "2026-07-27T12:00:00Z", ...draftToRow(draft) };
    expect(rowToDraft(row)?.pendingQuestions).toHaveLength(1);
    expect(rowToDraft(row)?.questionReason).toBe("Need the match key");
  });

  it("writes no question block once the questions are answered", () => {
    const answered = { ...draft, pendingQuestions: null, questionReason: null };
    expect(draftToRow(answered).questions).toBeNull();
  });

  it("returns null for a row it cannot read, instead of a half-built draft", () => {
    expect(rowToDraft({ id: "run-1" })).toBeNull();
    expect(rowToDraft(null)).toBeNull();
    expect(rowToDraft({ ...draftToRow(draft), id: "r", updated_at: "x", mapping: { bad: true } })).toBeNull();
  });

  it("still lists a run whose body is unreadable, so it can be deleted", () => {
    // The summary columns are simple; only the jsonb can rot.
    expect(
      rowToSummary({
        id: "run-1",
        title: "Broken run",
        target_software: "X",
        confirmed: false,
        updated_at: "2026-07-27T12:00:00Z",
      })
    ).not.toBeNull();
  });
});

describe("formatUpdatedAt", () => {
  const now = new Date("2026-07-27T12:00:00Z");

  it("reads naturally at each scale", () => {
    expect(formatUpdatedAt("2026-07-27T11:59:40Z", now)).toBe("just now");
    expect(formatUpdatedAt("2026-07-27T11:30:00Z", now)).toBe("30 min ago");
    expect(formatUpdatedAt("2026-07-27T09:00:00Z", now)).toBe("3 hr ago");
    expect(formatUpdatedAt("2026-07-26T09:00:00Z", now)).toBe("1 day ago");
    expect(formatUpdatedAt("2026-07-20T12:00:00Z", now)).toBe("7 days ago");
    expect(formatUpdatedAt("2026-01-05T12:00:00Z", now)).toBe("2026-01-05");
  });

  it("says nothing rather than 'Invalid Date' for a bad timestamp", () => {
    expect(formatUpdatedAt("not a date", now)).toBe("");
  });
});
