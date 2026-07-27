
import { describe, expect, it } from "vitest";
import type { MappingsResult } from "../../llm/schemas.js";
import { makeRun as run } from "../../test-support/fixtures.js";
import { normalizeRows } from "./buildMappings.js";


function result(rows: Partial<MappingsResult["rows"][number]>[]): MappingsResult {
  return {
    rows: rows.map((row) => ({
      source_system: "target",
      source_obj: "Customer",
      source_field: "email",
      target_obj: "Contacts",
      target_field: "email",
      direction: "one_way",
      transform: null,
      required: true,
      match_key: true,
      notes: null,
      ...row,
    })),
    match_strategy: "Match on email.",
    gaps: [],
  };
}

describe("normalizeRows", () => {
  it("qualifies each object with the system it belongs to", () => {
    const [row] = normalizeRows(result([{ source_system: "target" }]), run());
    expect(row!.source_obj).toBe("Stripe · Customer");
    expect(row!.target_obj).toBe("HubSpot · Contacts");
  });

  it("flips the qualification when HubSpot is the source", () => {
    const [row] = normalizeRows(
      result([{ source_system: "hubspot", source_obj: "Deals", target_obj: "Invoice" }]),
      run()
    );
    expect(row!.source_obj).toBe("HubSpot · Deals");
    expect(row!.target_obj).toBe("Stripe · Invoice");
  });

  it("does not double-prefix an object the model already qualified", () => {
    const [row] = normalizeRows(
      result([{ source_obj: "Stripe Customer" }]),
      run()
    );
    expect(row!.source_obj).toBe("Stripe Customer");
  });

  it("clamps every row to one-way when the brief is one-way", () => {
    const rows = normalizeRows(
      result([{ direction: "two_way" }, { direction: "two_way" }]),
      run({ direction: "hubspot_to_target" })
    );
    expect(rows.every((r) => r.direction === "one_way")).toBe(true);
  });

  it("preserves two-way rows when the brief is two-way", () => {
    const [row] = normalizeRows(
      result([{ direction: "two_way" }]),
      run({ direction: "two_way" })
    );
    expect(row!.direction).toBe("two_way");
  });

  it("allows a one-way field inside a two-way integration", () => {
    const [row] = normalizeRows(
      result([{ direction: "one_way" }]),
      run({ direction: "two_way" })
    );
    expect(row!.direction).toBe("one_way");
  });

  it("normalises placeholder transforms and notes to null", () => {
    const rows = normalizeRows(
      result([
        { transform: "  " },
        { transform: "none", notes: "-" },
        { transform: "Cast to string", notes: "Real note" },
      ]),
      run()
    );
    expect(rows[0]!.transform).toBeNull();
    expect(rows[1]!.transform).toBeNull();
    expect(rows[1]!.notes).toBeNull();
    expect(rows[2]!.transform).toBe("Cast to string");
    expect(rows[2]!.notes).toBe("Real note");
  });

  it("keeps UNKNOWN field names rather than dropping the row", () => {
    const [row] = normalizeRows(
      result([{ source_field: "UNKNOWN", notes: "API field not documented" }]),
      run()
    );
    expect(row!.source_field).toBe("UNKNOWN");
    expect(row!.notes).toBe("API field not documented");
  });

  it("falls back to a generic system name when the target is unnamed", () => {
    const [row] = normalizeRows(result([{}]), run({ target_software: null }));
    expect(row!.source_obj).toBe("Target system · Customer");
  });
});
