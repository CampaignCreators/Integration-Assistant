import { describe, expect, it } from "vitest";
import { buildUploadPath, isPathWithinRun, sanitizeFilename } from "./storage-paths.js";

const RUN = "11111111-1111-1111-1111-111111111111";
const OTHER_RUN = "22222222-2222-2222-2222-222222222222";

describe("sanitizeFilename", () => {
  it("keeps ordinary names and extensions intact", () => {
    expect(sanitizeFilename("discovery-call.vtt")).toBe("discovery-call.vtt");
    expect(sanitizeFilename("Requirements_v2.final.docx")).toBe(
      "Requirements_v2.final.docx"
    );
  });

  it("replaces separators and spaces so the key stays one segment", () => {
    expect(sanitizeFilename("notes/../secret.txt")).toBe("notes_.._secret.txt");
    expect(sanitizeFilename("call notes (final).pdf")).toBe("call_notes_final_.pdf");
  });

  it("strips leading dots and never returns an empty name", () => {
    expect(sanitizeFilename(".env")).toBe("env");
    expect(sanitizeFilename("...")).toBe("file");
    expect(sanitizeFilename("!!!")).toBe("_");
  });

  it("keeps the tail of a very long name so the extension survives", () => {
    const name = `${"a".repeat(300)}.docx`;
    const result = sanitizeFilename(name);
    expect(result).toHaveLength(100);
    expect(result.endsWith(".docx")).toBe(true);
  });
});

describe("buildUploadPath", () => {
  it("namespaces every file under its run", () => {
    const path = buildUploadPath(RUN, "call.vtt");
    expect(path.startsWith(`${RUN}/`)).toBe(true);
    expect(path.endsWith("-call.vtt")).toBe(true);
    expect(isPathWithinRun(path, RUN)).toBe(true);
  });

  it("does not collide for identical filenames", () => {
    expect(buildUploadPath(RUN, "call.vtt")).not.toBe(buildUploadPath(RUN, "call.vtt"));
  });
});

describe("isPathWithinRun", () => {
  it("accepts a well-formed key for this run", () => {
    expect(isPathWithinRun(`${RUN}/abc-call.vtt`, RUN)).toBe(true);
  });

  it("rejects another run's file", () => {
    expect(isPathWithinRun(`${OTHER_RUN}/abc-call.vtt`, RUN)).toBe(false);
  });

  it("rejects traversal and nested or absolute paths", () => {
    expect(isPathWithinRun(`${RUN}/../${OTHER_RUN}/x.txt`, RUN)).toBe(false);
    expect(isPathWithinRun(`${RUN}/nested/x.txt`, RUN)).toBe(false);
    expect(isPathWithinRun(`/${RUN}/x.txt`, RUN)).toBe(false);
  });

  it("rejects the bare run folder and prefix look-alikes", () => {
    expect(isPathWithinRun(`${RUN}/`, RUN)).toBe(false);
    expect(isPathWithinRun(RUN, RUN)).toBe(false);
    expect(isPathWithinRun(`${RUN}-evil/x.txt`, RUN)).toBe(false);
  });
});
