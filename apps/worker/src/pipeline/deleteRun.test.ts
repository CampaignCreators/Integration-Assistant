import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Deletion has to reach Storage as well as the database (spec §10 privacy).
 * If the run row went first, its cascade would remove the rows pointing at the
 * files, leaving client PII in a bucket that nothing references.
 */

interface StorageEntry {
  name: string;
  id: string | null;
}

function makeSupabaseMock(tree: Record<string, StorageEntry[]>) {
  const removed: { bucket: string; paths: string[] }[] = [];
  const deletedRuns: string[] = [];
  const order: string[] = [];
  let removeError: string | null = null;

  const storage = {
    from: (bucket: string) => ({
      list: async (prefix: string) => {
        const key = `${bucket}:${prefix}`;
        return { data: tree[key] ?? [], error: null };
      },
      remove: async (paths: string[]) => {
        order.push(`storage:${bucket}`);
        if (removeError) return { error: { message: removeError } };
        removed.push({ bucket, paths });
        return { error: null };
      },
    }),
  };

  const from = () => ({
    delete: () => ({
      eq: async (_col: string, value: string) => {
        order.push("db:runs");
        deletedRuns.push(value);
        return { error: null };
      },
    }),
  });

  return {
    mock: { storage, from },
    removed,
    deletedRuns,
    order,
    failRemove: (message: string) => {
      removeError = message;
    },
  };
}

const RUN = "11111111-1111-1111-1111-111111111111";

async function loadDeleteRun(harness: ReturnType<typeof makeSupabaseMock>) {
  vi.doMock("../lib/supabase.js", () => ({ supabase: harness.mock }));
  return import("./deleteRun.js");
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("deleteRunAndFiles", () => {
  it("removes uploads, deliverables, then the run row", async () => {
    const harness = makeSupabaseMock({
      [`uploads:${RUN}`]: [{ name: "call.vtt", id: "f1" }],
      [`deliverables:${RUN}`]: [{ name: "v1", id: null }],
      [`deliverables:${RUN}/v1`]: [
        { name: "requirements.docx", id: "f2" },
        { name: "mapping.xlsx", id: "f3" },
      ],
    });
    const { deleteRunAndFiles } = await loadDeleteRun(harness);

    const report = await deleteRunAndFiles(RUN);

    expect(report.uploadsRemoved).toBe(1);
    expect(report.deliverablesRemoved).toBe(2);
    expect(report.storageErrors).toEqual([]);
    expect(harness.deletedRuns).toEqual([RUN]);

    // Storage must be cleared before the cascade removes the pointers to it.
    expect(harness.order.indexOf("db:runs")).toBe(harness.order.length - 1);
  });

  it("walks into versioned deliverable folders", async () => {
    const harness = makeSupabaseMock({
      [`uploads:${RUN}`]: [],
      [`deliverables:${RUN}`]: [
        { name: "v1", id: null },
        { name: "v2", id: null },
      ],
      [`deliverables:${RUN}/v1`]: [{ name: "a.docx", id: "f1" }],
      [`deliverables:${RUN}/v2`]: [{ name: "b.docx", id: "f2" }],
    });
    const { deleteRunAndFiles } = await loadDeleteRun(harness);

    await deleteRunAndFiles(RUN);

    const paths = harness.removed.flatMap((r) => r.paths);
    expect(paths).toContain(`${RUN}/v1/a.docx`);
    expect(paths).toContain(`${RUN}/v2/b.docx`);
  });

  it("still deletes the run when storage cleanup fails, and reports it", async () => {
    const harness = makeSupabaseMock({
      [`uploads:${RUN}`]: [{ name: "call.vtt", id: "f1" }],
      [`deliverables:${RUN}`]: [],
    });
    harness.failRemove("bucket unavailable");
    const { deleteRunAndFiles } = await loadDeleteRun(harness);

    const report = await deleteRunAndFiles(RUN);

    // Leaving the row behind would strand the run in the UI with no way to
    // retry the deletion; the objects can be swept separately.
    expect(harness.deletedRuns).toEqual([RUN]);
    expect(report.storageErrors).toContain("uploads: bucket unavailable");
    expect(report.uploadsRemoved).toBe(0);
  });

  it("handles a run with no files at all", async () => {
    const harness = makeSupabaseMock({
      [`uploads:${RUN}`]: [],
      [`deliverables:${RUN}`]: [],
    });
    const { deleteRunAndFiles } = await loadDeleteRun(harness);

    const report = await deleteRunAndFiles(RUN);

    expect(report.uploadsRemoved).toBe(0);
    expect(report.deliverablesRemoved).toBe(0);
    expect(harness.removed).toEqual([]);
    expect(harness.deletedRuns).toEqual([RUN]);
  });

  it("only ever touches paths under this run's own prefix", async () => {
    const harness = makeSupabaseMock({
      [`uploads:${RUN}`]: [{ name: "call.vtt", id: "f1" }],
      [`deliverables:${RUN}`]: [{ name: "v1", id: null }],
      [`deliverables:${RUN}/v1`]: [{ name: "doc.docx", id: "f2" }],
    });
    const { deleteRunAndFiles } = await loadDeleteRun(harness);

    await deleteRunAndFiles(RUN);

    for (const path of harness.removed.flatMap((r) => r.paths)) {
      expect(path.startsWith(`${RUN}/`)).toBe(true);
    }
  });
});
