import type { MappingTable, Narrative, Questions } from "./schemas";

/**
 * Demo output, used when no Anthropic key is configured.
 *
 * It exists so the whole flow can be walked through before a key exists. It is
 * deliberately, visibly fake: a document that looked researched but was invented
 * is the worst thing this tool could produce, so demo output is made obviously
 * unusable rather than merely unreliable.
 */

export const DEMO_MARKER = "[DEMO DATA — not real analysis]";

const DEMO_NOTE =
  "This was produced in demo mode with no Anthropic API key configured. Nothing " +
  "here was analysed or researched. Set ANTHROPIC_API_KEY and run it again before " +
  "relying on any of it.";

export function demoQuestions(): Questions {
  return {
    reason: `${DEMO_MARKER} Demo mode always asks once, so the flow can be seen end to end.`,
    questions: [
      {
        question: "Which direction should data flow?",
        why: "It decides whether the mapping needs write-back rows.",
        suggestions: [
          "Into HubSpot only",
          "Out of HubSpot only",
          "Both directions",
        ],
      },
      {
        question: "What identifies the same customer in both systems?",
        why: "Without a match key, every sync creates duplicates.",
        suggestions: ["Email address", "Phone number", "An external ID"],
      },
    ],
  };
}

export function demoMapping(targetSoftware: string): MappingTable {
  const system = targetSoftware.trim() || "the other system";
  return {
    summary: `${DEMO_MARKER} Placeholder mapping between ${system} and HubSpot. No analysis was performed.`,
    objects: [
      {
        hubspot_object: "contacts",
        hubspot_object_name: null,
        external_object: "Customer",
        purpose: `${DEMO_MARKER} Placeholder — customers become HubSpot contacts.`,
        match_key: "Email address",
        direction: "to_hubspot",
      },
      {
        hubspot_object: "companies",
        hubspot_object_name: null,
        external_object: "Account",
        purpose: `${DEMO_MARKER} Placeholder — commercial accounts become companies.`,
        match_key: "Company domain",
        direction: "to_hubspot",
      },
      {
        hubspot_object: "deals",
        hubspot_object_name: null,
        external_object: "Order",
        purpose: `${DEMO_MARKER} Placeholder — orders become deals.`,
        match_key: "External order id",
        direction: "to_hubspot",
      },
    ],
    rows: [
      row("contacts", "Customer", "email", "email", true, true, null),
      row("contacts", "Customer", "firstname", "name", false, true, "Split on the first space"),
      row("contacts", "Customer", "lastname", "name", false, true, "Everything after the first space"),
      row("contacts", "Customer", "phone", "phone_number", false, false, "Strip formatting to E.164"),
      row("companies", "Account", "name", "account_name", false, true, null),
      row("companies", "Account", "domain", "website", true, false, "Host only, no scheme"),
      row("deals", "Order", "dealname", "order_number", false, true, 'Prefix with "Order "'),
      row("deals", "Order", "amount", "total", false, true, "Minor units to major units"),
      row("deals", "Order", "dealstage", "UNKNOWN", false, true, "Stage list not established in demo mode"),
      row("deals", "Order", "external_order_id", "id", true, true, "Custom property"),
    ],
    assumptions: [
      `${DEMO_MARKER} Placeholder assumption: contacts are matched on email.`,
      `${DEMO_MARKER} Placeholder assumption: one-way into HubSpot.`,
    ],
    open_questions: [DEMO_NOTE],
  };
}

function row(
  hubspotObject: MappingTable["rows"][number]["hubspot_object"],
  externalObject: string,
  hubspotProperty: string,
  externalField: string,
  isMatchKey: boolean,
  required: boolean,
  transform: string | null
): MappingTable["rows"][number] {
  return {
    hubspot_object: hubspotObject,
    hubspot_object_name: null,
    hubspot_property: hubspotProperty,
    external_object: externalObject,
    external_field: externalField,
    direction: "to_hubspot",
    is_match_key: isMatchKey,
    required,
    transform,
    notes: DEMO_MARKER,
  };
}

export function demoNarrative(targetSoftware: string): Narrative {
  const system = targetSoftware.trim() || "the other system";
  return {
    integration_title: `${system} → HubSpot ${DEMO_MARKER}`,
    business_goal: `${DEMO_MARKER} Placeholder business goal. Nothing here was analysed.`,
    scope_summary: `${DEMO_MARKER} Placeholder scope covering contacts, companies and deals.`,
    out_of_scope: [`${DEMO_MARKER} Placeholder out-of-scope item.`],
    systems_overview: `${DEMO_MARKER} Placeholder systems overview.`,
    auth_and_access: `${DEMO_MARKER} Placeholder auth notes.`,
    sync_behaviour: `${DEMO_MARKER} Placeholder sync behaviour.`,
    edge_cases: [`${DEMO_MARKER} Placeholder edge case: a customer with no email address.`],
    error_handling: `${DEMO_MARKER} Placeholder error-handling notes.`,
    testing_checklist: [`${DEMO_MARKER} Placeholder test: create a record and confirm it appears.`],
    risks: [DEMO_NOTE],
    next_steps: [`${DEMO_MARKER} Set ANTHROPIC_API_KEY and run this again.`],
  };
}
