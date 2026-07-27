import type { MappingRowInput } from "@cc/shared";

/**
 * Works out what a PATCH of the mapping table means, given what is already
 * stored. Kept pure and separate from the route because a mistake here loses a
 * reviewer's corrections silently.
 *
 * The body carries the complete desired table:
 *  - a row with an `id` that exists is updated in place
 *  - a row without an `id` is inserted
 *  - a stored row absent from the body is deleted
 *  - an `id` that is not stored for this run is rejected, never inserted
 */
export interface MappingSyncPlan {
  updates: { id: string; row: MappingRowInput; position: number }[];
  inserts: { row: MappingRowInput; position: number }[];
  deletes: string[];
  /** Ids the caller sent that do not belong to this run. */
  unknownIds: string[];
}

export function planMappingSync(
  existingIds: string[],
  rows: MappingRowInput[]
): MappingSyncPlan {
  const existing = new Set(existingIds);
  const seen = new Set<string>();

  const updates: MappingSyncPlan["updates"] = [];
  const inserts: MappingSyncPlan["inserts"] = [];
  const unknownIds: string[] = [];

  rows.forEach((row, position) => {
    if (row.id === undefined) {
      inserts.push({ row, position });
      return;
    }
    if (!existing.has(row.id)) {
      unknownIds.push(row.id);
      return;
    }
    // A duplicated id would make the outcome depend on write order.
    if (seen.has(row.id)) {
      unknownIds.push(row.id);
      return;
    }
    seen.add(row.id);
    updates.push({ id: row.id, row, position });
  });

  const deletes = existingIds.filter((id) => !seen.has(id));

  return { updates, inserts, deletes, unknownIds };
}
