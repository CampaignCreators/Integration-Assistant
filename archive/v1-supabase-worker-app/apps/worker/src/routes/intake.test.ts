import { describe, expect, it } from "vitest";
import { intakeSchema, validateSubmittable } from "@cc/shared";

describe("validateSubmittable", () => {
  const complete = {
    target_software: "Stripe",
    direction: "two_way",
    frequency: "near_realtime",
    objects: ["contacts", "deals"],
  };

  it("passes a complete brief", () => {
    expect(validateSubmittable(complete)).toEqual([]);
  });

  it("reports every missing answer in plain language", () => {
    const problems = validateSubmittable({
      target_software: null,
      direction: null,
      frequency: null,
      objects: [],
    });
    expect(problems).toHaveLength(4);
    expect(problems.join(" ")).not.toMatch(/null|undefined|field/i);
  });

  it("requires at least one object", () => {
    expect(validateSubmittable({ ...complete, objects: [] })).toEqual([
      "Select at least one type of record to sync.",
    ]);
  });
});

describe("intakeSchema", () => {
  it("accepts a partial brief so answers can autosave mid-wizard", () => {
    expect(intakeSchema.safeParse({ target_software: "Shopify" }).success).toBe(true);
    expect(intakeSchema.safeParse({}).success).toBe(true);
  });

  it("allows clearing the optional volume bucket", () => {
    expect(intakeSchema.safeParse({ volume: null }).success).toBe(true);
  });

  it("rejects unknown enum values", () => {
    expect(intakeSchema.safeParse({ direction: "sideways" }).success).toBe(false);
    expect(intakeSchema.safeParse({ objects: ["invoices"] }).success).toBe(false);
    expect(intakeSchema.safeParse({ frequency: "weekly" }).success).toBe(false);
  });

  it("trims free text", () => {
    const parsed = intakeSchema.parse({ target_software: "  Stripe  " });
    expect(parsed.target_software).toBe("Stripe");
  });
});
