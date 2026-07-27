import { isUnknown } from "./documents";
import { objectLabel, type MappingRow, type MappingTable, type ObjectPlan } from "./schemas";

/**
 * Pure helpers for reading and editing the mapping table.
 *
 * Kept out of the components so the rules — what counts as a gap, what a new row
 * starts as, what happens to rows when an object is removed — can be tested
 * without rendering anything.
 */

export interface ObjectGroup {
  plan: ObjectPlan;
  label: string;
  rows: { row: MappingRow; index: number }[];
}

/** Groups rows under their object, keeping each row's index for editing. */
export function groupByObject(mapping: MappingTable): ObjectGroup[] {
  return mapping.objects.map((plan) => ({
    plan,
    label: `${objectLabel(plan.hubspot_object, plan.hubspot_object_name)} ↔ ${plan.external_object}`,
    rows: mapping.rows
      .map((row, index) => ({ row, index }))
      .filter(
        ({ row }) =>
          row.hubspot_object === plan.hubspot_object &&
          row.external_object === plan.external_object
      ),
  }));
}

/** Rows whose object pair isn't in the plan — usually after an edit. */
export function ungroupedRows(mapping: MappingTable): { row: MappingRow; index: number }[] {
  return mapping.rows
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row }) =>
        !mapping.objects.some(
          (plan) =>
            plan.hubspot_object === row.hubspot_object &&
            plan.external_object === row.external_object
        )
    );
}

export interface MappingIssue {
  severity: "warn" | "info";
  message: string;
}

/**
 * What is worth saying before someone confirms the table.
 *
 * These are warnings, never blocks. A mapping with an unresolved field is a
 * legitimate thing to hand a developer — pretending otherwise would push people
 * into inventing a field name to get past a validation error.
 */
export function mappingIssues(mapping: MappingTable): MappingIssue[] {
  const issues: MappingIssue[] = [];
  const groups = groupByObject(mapping);

  for (const group of groups) {
    if (group.rows.length === 0) {
      issues.push({
        severity: "warn",
        message: `${group.label} has no fields mapped yet.`,
      });
      continue;
    }
    if (!group.rows.some(({ row }) => row.is_match_key)) {
      issues.push({
        severity: "warn",
        message: `${group.label} has no match key, so a sync could create duplicates.`,
      });
    }
  }

  const unknown = mapping.rows.filter((row) => isUnknown(row.external_field));
  if (unknown.length > 0) {
    issues.push({
      severity: "info",
      message: `${unknown.length} field${unknown.length === 1 ? "" : "s"} on ${
        unknown.length === 1 ? "" : "the "
      }other system still need confirming — they carry through to the handoff as work to do.`,
    });
  }

  const stranded = ungroupedRows(mapping);
  if (stranded.length > 0) {
    issues.push({
      severity: "info",
      message: `${stranded.length} row${
        stranded.length === 1 ? "" : "s"
      } no longer match an object in scope. They are listed at the bottom.`,
    });
  }

  return issues;
}

/** A new row, pre-filled from the object it is being added to. */
export function blankRow(plan: ObjectPlan): MappingRow {
  return {
    hubspot_object: plan.hubspot_object,
    hubspot_object_name: plan.hubspot_object_name,
    hubspot_property: "",
    external_object: plan.external_object,
    external_field: "",
    direction: plan.direction,
    is_match_key: false,
    required: false,
    transform: null,
    notes: null,
  };
}

export function updateRow(
  mapping: MappingTable,
  index: number,
  patch: Partial<MappingRow>
): MappingTable {
  return {
    ...mapping,
    rows: mapping.rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
  };
}

export function removeRow(mapping: MappingTable, index: number): MappingTable {
  return { ...mapping, rows: mapping.rows.filter((_, i) => i !== index) };
}

export function addRow(mapping: MappingTable, plan: ObjectPlan): MappingTable {
  return { ...mapping, rows: [...mapping.rows, blankRow(plan)] };
}

export function updateObject(
  mapping: MappingTable,
  index: number,
  patch: Partial<ObjectPlan>
): MappingTable {
  const target = mapping.objects[index];
  if (!target) return mapping;
  const updated = { ...target, ...patch };

  // Rows are tied to their object by the pair of names, so renaming the external
  // object has to carry its rows with it or they would be orphaned.
  const rows =
    patch.external_object && patch.external_object !== target.external_object
      ? mapping.rows.map((row) =>
          row.hubspot_object === target.hubspot_object &&
          row.external_object === target.external_object
            ? { ...row, external_object: updated.external_object }
            : row
        )
      : mapping.rows;

  return {
    ...mapping,
    objects: mapping.objects.map((object, i) => (i === index ? updated : object)),
    rows,
  };
}

/** Removes an object and every row belonging to it. */
export function removeObject(mapping: MappingTable, index: number): MappingTable {
  const target = mapping.objects[index];
  if (!target) return mapping;
  return {
    ...mapping,
    objects: mapping.objects.filter((_, i) => i !== index),
    rows: mapping.rows.filter(
      (row) =>
        !(
          row.hubspot_object === target.hubspot_object &&
          row.external_object === target.external_object
        )
    ),
  };
}

export function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, i) => i !== index);
}

/** Blank rows help nobody downstream; drop them when the table is confirmed. */
export function pruneEmptyRows(mapping: MappingTable): MappingTable {
  return {
    ...mapping,
    rows: mapping.rows.filter(
      (row) => row.hubspot_property.trim() !== "" || row.external_field.trim() !== ""
    ),
  };
}
