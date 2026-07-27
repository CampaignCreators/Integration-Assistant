import type { MappingRowInput } from "@cc/shared";
import { describe, expect, it } from "vitest";
import { planMappingSync } from "./mapping-sync.js";

/**
 * A mistake in this plan loses a reviewer's corrections without any error, so
 * every branch is pinned down here.
 */

function row(overrides: Partial<MappingRowInput> = {}): MappingRowInput {
  return {
    source_obj: "Stripe · Customer",
    source_field: "email",
    target_obj: "HubSpot · Contacts",
    target_field: "email",
    direction: "one_way",
    transform: null,
    required: true,
    match_key: true,
    notes: null,
    ...overrides,
  };
}

const A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const C = "cccccccc-cccc-cccc-cccc-cccccccccccc";

describe("planMappingSync", () => {
  it("updates rows that carry a known id", () => {
    const plan = planMappingSync([A, B], [row({ id: A }), row({ id: B })]);

    expect(plan.updates.map((u) => u.id)).toEqual([A, B]);
    expect(plan.inserts).toEqual([]);
    expect(plan.deletes).toEqual([]);
    expect(plan.unknownIds).toEqual([]);
  });

  it("inserts rows with no id", () => {
    const plan = planMappingSync([A], [row({ id: A }), row()]);

    expect(plan.updates).toHaveLength(1);
    expect(plan.inserts).toHaveLength(1);
    expect(plan.deletes).toEqual([]);
  });

  it("deletes stored rows the caller left out", () => {
    const plan = planMappingSync([A, B, C], [row({ id: B })]);

    expect(plan.deletes).toEqual([A, C]);
    expect(plan.updates.map((u) => u.id)).toEqual([B]);
  });

  it("assigns position from array order, not from the stored order", () => {
    const plan = planMappingSync([A, B], [row({ id: B }), row(), row({ id: A })]);

    expect(plan.updates.find((u) => u.id === B)!.position).toBe(0);
    expect(plan.inserts[0]!.position).toBe(1);
    expect(plan.updates.find((u) => u.id === A)!.position).toBe(2);
  });

  it("rejects an id from another run rather than inserting it", () => {
    const plan = planMappingSync([A], [row({ id: C })]);

    expect(plan.unknownIds).toEqual([C]);
    expect(plan.inserts).toEqual([]);
    expect(plan.updates).toEqual([]);
  });

  it("rejects a duplicated id, whose outcome would depend on write order", () => {
    const plan = planMappingSync([A], [row({ id: A }), row({ id: A })]);

    expect(plan.unknownIds).toEqual([A]);
    expect(plan.updates).toHaveLength(1);
  });

  it("does not delete a row that a rejected duplicate also referenced", () => {
    // The caller gets a 400, so nothing is written — but the plan must not
    // schedule A for deletion just because its second mention was rejected.
    const plan = planMappingSync([A, B], [row({ id: A }), row({ id: A })]);
    expect(plan.deletes).toEqual([B]);
    expect(plan.deletes).not.toContain(A);
  });

  it("clearing the table deletes every stored row", () => {
    const plan = planMappingSync([A, B], []);

    expect(plan.deletes).toEqual([A, B]);
    expect(plan.updates).toEqual([]);
    expect(plan.inserts).toEqual([]);
  });

  it("building a table from scratch inserts everything", () => {
    const plan = planMappingSync([], [row(), row(), row()]);

    expect(plan.inserts.map((i) => i.position)).toEqual([0, 1, 2]);
    expect(plan.deletes).toEqual([]);
  });

  it("is idempotent — replaying the same body plans the same work", () => {
    const body = [row({ id: A }), row({ id: B, notes: "edited" })];
    expect(planMappingSync([A, B], body)).toEqual(planMappingSync([A, B], body));
  });

  it("carries the edited values through to the update", () => {
    const plan = planMappingSync(
      [A],
      [row({ id: A, target_field: "custom_email", notes: "Reviewer corrected this" })]
    );

    expect(plan.updates[0]!.row.target_field).toBe("custom_email");
    expect(plan.updates[0]!.row.notes).toBe("Reviewer corrected this");
  });
});
