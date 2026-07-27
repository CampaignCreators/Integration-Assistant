import { describe, expect, it } from "vitest";
import {
  addRow,
  blankRow,
  groupByObject,
  mappingIssues,
  pruneEmptyRows,
  removeObject,
  removeRow,
  ungroupedRows,
  updateObject,
  updateRow,
} from "./mapping";
import type { MappingRow, MappingTable, ObjectPlan } from "./schemas";

function plan(overrides: Partial<ObjectPlan> = {}): ObjectPlan {
  return {
    hubspot_object: "contacts",
    hubspot_object_name: null,
    external_object: "Customer",
    purpose: "Customers become contacts",
    match_key: "Email",
    direction: "to_hubspot",
    ...overrides,
  };
}

function row(overrides: Partial<MappingRow> = {}): MappingRow {
  return {
    hubspot_object: "contacts",
    hubspot_object_name: null,
    hubspot_property: "email",
    external_object: "Customer",
    external_field: "email",
    direction: "to_hubspot",
    is_match_key: true,
    required: true,
    transform: null,
    notes: null,
    ...overrides,
  };
}

function table(overrides: Partial<MappingTable> = {}): MappingTable {
  return {
    summary: "A mapping",
    objects: [plan()],
    rows: [row()],
    assumptions: [],
    open_questions: [],
    ...overrides,
  };
}

describe("groupByObject", () => {
  it("puts each row under its object and keeps its index for editing", () => {
    const mapping = table({
      objects: [plan(), plan({ hubspot_object: "deals", external_object: "Order" })],
      rows: [
        row(),
        row({ hubspot_object: "deals", external_object: "Order", hubspot_property: "dealname" }),
        row({ hubspot_property: "firstname", is_match_key: false }),
      ],
    });

    const groups = groupByObject(mapping);
    expect(groups.map((g) => g.rows.length)).toEqual([2, 1]);
    expect(groups[0]?.rows.map((r) => r.index)).toEqual([0, 2]);
    expect(groups[1]?.label).toBe("Deals ↔ Order");
  });

  it("names a custom object by its own name", () => {
    const mapping = table({
      objects: [plan({ hubspot_object: "custom", hubspot_object_name: "Service Visit" })],
      rows: [],
    });
    expect(groupByObject(mapping)[0]?.label).toBe("Service Visit ↔ Customer");
  });
});

describe("mappingIssues", () => {
  it("says nothing when every object has rows and a match key", () => {
    expect(mappingIssues(table())).toEqual([]);
  });

  it("flags an object with no fields mapped", () => {
    const mapping = table({ rows: [] });
    expect(mappingIssues(mapping)[0]?.message).toMatch(/no fields mapped/i);
  });

  it("flags a missing match key, because that is what creates duplicates", () => {
    const mapping = table({ rows: [row({ is_match_key: false })] });
    const issues = mappingIssues(mapping);
    expect(issues.some((issue) => /no match key/i.test(issue.message))).toBe(true);
  });

  it("reports unresolved fields as information, not as a blocker", () => {
    const mapping = table({ rows: [row({ external_field: "UNKNOWN" })] });
    const unresolved = mappingIssues(mapping).find((issue) => /need confirming/i.test(issue.message));
    expect(unresolved?.severity).toBe("info");
  });

  it("treats a lowercase 'unknown' the same way", () => {
    const mapping = table({ rows: [row({ external_field: " unknown " })] });
    expect(mappingIssues(mapping).some((i) => /need confirming/i.test(i.message))).toBe(true);
  });

  it("notices rows left stranded by an edit", () => {
    const mapping = table({
      rows: [row(), row({ external_object: "Renamed" })],
    });
    expect(mappingIssues(mapping).some((i) => /no longer match an object/i.test(i.message))).toBe(
      true
    );
  });
});

describe("editing", () => {
  it("updates only the row asked for", () => {
    const mapping = table({ rows: [row(), row({ hubspot_property: "firstname" })] });
    const next = updateRow(mapping, 1, { hubspot_property: "lastname" });
    expect(next.rows[0]?.hubspot_property).toBe("email");
    expect(next.rows[1]?.hubspot_property).toBe("lastname");
  });

  it("does not mutate the table it was given", () => {
    const mapping = table();
    const next = updateRow(mapping, 0, { hubspot_property: "changed" });
    expect(mapping.rows[0]?.hubspot_property).toBe("email");
    expect(next).not.toBe(mapping);
  });

  it("adds a row pre-filled from its object, so it is not stranded on arrival", () => {
    const mapping = table({ objects: [plan({ direction: "two_way" })] });
    const next = addRow(mapping, mapping.objects[0]!);
    const added = next.rows[next.rows.length - 1]!;
    expect(added.external_object).toBe("Customer");
    expect(added.hubspot_object).toBe("contacts");
    expect(added.direction).toBe("two_way");
    expect(ungroupedRows(next)).toEqual([]);
  });

  it("carries rows along when an object is renamed, rather than orphaning them", () => {
    const mapping = table({ rows: [row(), row({ hubspot_property: "firstname" })] });
    const next = updateObject(mapping, 0, { external_object: "Client" });
    expect(next.rows.every((r) => r.external_object === "Client")).toBe(true);
    expect(ungroupedRows(next)).toEqual([]);
  });

  it("leaves other objects' rows alone on rename", () => {
    const mapping = table({
      objects: [plan(), plan({ hubspot_object: "deals", external_object: "Order" })],
      rows: [row(), row({ hubspot_object: "deals", external_object: "Order" })],
    });
    const next = updateObject(mapping, 0, { external_object: "Client" });
    expect(next.rows[1]?.external_object).toBe("Order");
  });

  it("removes an object together with its rows", () => {
    const mapping = table({
      objects: [plan(), plan({ hubspot_object: "deals", external_object: "Order" })],
      rows: [row(), row({ hubspot_object: "deals", external_object: "Order" })],
    });
    const next = removeObject(mapping, 0);
    expect(next.objects).toHaveLength(1);
    expect(next.rows).toHaveLength(1);
    expect(next.rows[0]?.hubspot_object).toBe("deals");
  });

  it("ignores a remove for an index that isn't there", () => {
    const mapping = table();
    expect(removeObject(mapping, 7)).toEqual(mapping);
    expect(updateObject(mapping, 7, { match_key: "x" })).toEqual(mapping);
  });

  it("removes a single row by index", () => {
    const mapping = table({ rows: [row(), row({ hubspot_property: "firstname" })] });
    expect(removeRow(mapping, 0).rows.map((r) => r.hubspot_property)).toEqual(["firstname"]);
  });
});

describe("pruneEmptyRows", () => {
  it("drops rows the user added but never filled in", () => {
    const mapping = table({
      rows: [row(), blankRow(plan()), row({ hubspot_property: "", external_field: "  " })],
    });
    expect(pruneEmptyRows(mapping).rows).toHaveLength(1);
  });

  it("keeps a half-filled row, since it still tells a developer something", () => {
    const mapping = table({ rows: [row({ external_field: "" })] });
    expect(pruneEmptyRows(mapping).rows).toHaveLength(1);
  });
});
