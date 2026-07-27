import type { BriefRow, RunRow } from "@cc/shared";
import {
  DIRECTION_PHRASES,
  FREQUENCY_PHRASES,
  OBJECT_PHRASES,
  VOLUME_PHRASES,
} from "./phrasing.js";
import type { MarketplaceResult, TargetResult } from "./schemas.js";

/**
 * Prompts for the research pipeline. The guardrails in spec §8.2 are stated
 * once here and inherited by every step.
 */
const GUARDRAILS = `
You are a solutions engineer at a HubSpot partner agency, scoping an integration
between HubSpot and another piece of software. Your findings go into a document a
client will read, so they must be defensible.

Rules you must follow:
- Ground every claim in public documentation you actually retrieved in this session.
  Cite the URL. If you did not read it, you do not know it.
- Never invent an API endpoint, a field name, a price, a rating, or a review. If you
  cannot find something, say so in open_questions. An honest gap is useful; a plausible
  guess is actively harmful.
- Distinguish what the vendor documents from what users report. Label the difference.
- Prefer primary sources (the vendor's own developer docs, the HubSpot App Marketplace
  listing) over blog posts and comparison sites.
- You have read-only access to public web pages. You are not connected to anyone's
  HubSpot account or to the target system, and you must not attempt to authenticate
  anywhere.
- When you are done researching, report by calling the submit tool. Everything you
  want recorded must go through that tool call — prose outside it is discarded.
`.trim();

function briefContext(run: RunRow, brief: BriefRow | null): string {
  const objects = (brief?.objects ?? []).map((o) => OBJECT_PHRASES[o] ?? o);
  const lines = [
    `Target software: ${run.target_software ?? "not specified"}`,
    `Direction: ${run.direction ? DIRECTION_PHRASES[run.direction] : "not specified"}`,
    `Frequency: ${run.frequency ? FREQUENCY_PHRASES[run.frequency] : "not specified"}`,
    `Records in scope: ${objects.length > 0 ? objects.join(", ") : "not specified"}`,
  ];
  if (brief?.description) lines.push(`What it should do: ${brief.description}`);
  if (brief?.trigger_event) lines.push(`Trigger: ${brief.trigger_event}`);
  if (brief?.volume) lines.push(`Approximate volume: ${VOLUME_PHRASES[brief.volume]}`);
  return lines.join("\n");
}

export function extractSignalsPrompt(
  run: RunRow,
  brief: BriefRow | null,
  documents: { filename: string; text: string }[]
): { system: string; prompt: string } {
  const material =
    documents.length === 0
      ? "(No discovery files were uploaded — work from the guided brief alone.)"
      : documents
          .map((doc) => `--- FILE: ${doc.filename} ---\n${doc.text}`)
          .join("\n\n");

  return {
    system: `${GUARDRAILS}

For this step you are reading discovery material only. Do not research anything —
just extract what is actually there.`,
    prompt: `A sales rep has submitted an integration scoping request.

WHAT THE REP TOLD US:
${briefContext(run, brief)}

DISCOVERY MATERIAL:
${material}

Pull out the structured signals this material contains: the systems mentioned, the
record types and specific fields discussed, the pain points driving this project, the
behaviours the integration must have, edge cases, and any constraints (compliance,
timing, data ownership, budget, deadlines).

Only capture what appears in the material or the brief. If you conclude something the
material implies but does not state, include it and set is_inferred to true.

Then reconcile the material against the rep's answers. Where they disagree — the rep
chose one-way but the call describes changes flowing both ways, or the rep listed
Contacts but the call is mostly about invoices — flag it so the rep can resolve it
before we spend time researching.`,
  };
}

export function hubspotPrompt(
  run: RunRow,
  brief: BriefRow | null,
  signals: string[]
): { system: string; prompt: string } {
  return {
    system: GUARDRAILS,
    prompt: `Research the HubSpot side of this integration against HubSpot's current
public developer documentation.

THE BRIEF:
${briefContext(run, brief)}
${signals.length > 0 ? `\nFIELDS AND ENTITIES MENTIONED IN DISCOVERY:\n${signals.join("\n")}` : ""}

For each HubSpot object in scope, establish: the CRM API path that serves it, its
standard properties relevant to this integration, which properties HubSpot requires on
create, which properties this integration will need that HubSpot has no standard
equivalent for, and the properties HubSpot uses to deduplicate records.

Then establish how the objects in scope associate with each other, which
authentication model applies here and why, whether HubSpot can push changes for these
objects via webhooks, and the rate limits that apply — including which account tier
they depend on, since those numbers change.

Confirm everything against developers.hubspot.com rather than from memory: paths,
property names, and limits have all changed over time.`,
  };
}

export function targetPrompt(
  run: RunRow,
  brief: BriefRow | null,
  signals: string[]
): { system: string; prompt: string } {
  return {
    system: GUARDRAILS,
    prompt: `Research whether and how we can integrate with ${run.target_software}.

THE BRIEF:
${briefContext(run, brief)}
${signals.length > 0 ? `\nFIELDS AND ENTITIES MENTIONED IN DISCOVERY:\n${signals.join("\n")}` : ""}

Find ${run.target_software}'s public API documentation and reach a clear verdict on
whether a usable API exists. Search the vendor's own site for a developer or API
section before relying on third-party summaries.

Three verdicts are possible and the distinction matters:
- available: public documentation describes a REST or GraphQL API we could build against.
- limited: an API exists but is gated behind an enterprise tier, partner programme, or
  sales conversation; or it is documented but too narrow to cover the records in scope.
- none_found: you searched and could not locate public API documentation.

Do not report "available" because a vendor markets "integrations" or has a Zapier app —
those are not evidence of an API we can build against. Look for actual endpoint
documentation.

If an API exists, capture the objects and endpoints matching the records in scope, the
field names documented on them, how it authenticates, how it paginates, its rate
limits, and whether it can push changes to us via webhooks. Note concretely where its
data model does not line up with HubSpot's — a single "name" field where HubSpot splits
first and last, statuses with no HubSpot equivalent, one-to-many relationships modelled
differently.`,
  };
}

export function marketplacePrompt(
  run: RunRow,
  brief: BriefRow | null
): { system: string; prompt: string } {
  return {
    system: GUARDRAILS,
    prompt: `Determine whether a native HubSpot App Marketplace integration already
exists between HubSpot and ${run.target_software}, and whether it is good enough for
this project.

THE BRIEF:
${briefContext(run, brief)}

Search the HubSpot App Marketplace specifically. A native app is a listing on
ecosystem.hubspot.com / the HubSpot App Marketplace connecting these two systems — not
a Zapier template, not a consultancy's service offering, not a general "works with
HubSpot" claim on the vendor's site.

If a listing exists, capture the publisher, the pricing model, the objects and sync
direction it documents, and its marketplace rating.

Then find out what actually happens when people use it. Look at marketplace reviews,
the HubSpot Community forums, and independent reviews. Summarise only reviews you
actually read — if you cannot find reviews, say so rather than characterising them.

Pay particular attention to limitations that would force a custom build: no control
over which fields sync, a fixed sync direction, no custom object support, no activity
or engagement sync, mapping that cannot be configured, silent sync failures. For each
limitation, judge whether it alone would block the integration this rep described.

Finally, decide whether the native app covers the objects, direction, and frequency in
the brief. If a native app does not exist, say so plainly and set native_app_exists to
false — that is a perfectly normal outcome.`,
  };
}

export function middlewarePrompt(
  run: RunRow,
  brief: BriefRow | null,
  target: TargetResult,
  marketplace: MarketplaceResult
): { system: string; prompt: string } {
  return {
    system: `${GUARDRAILS}

One rule matters more than the others in this step. Middleware is not a way around a
missing API. Make and Zapier both need the target system to expose an API or to have a
purpose-built connector on their platform. If neither exists, no middleware can bridge
it, and you must say so plainly rather than recommending middleware as a universal
fallback. Recommending Make or Zapier for a system that cannot be reached by either
would send this client down a dead end.`,
    prompt: `Assess whether middleware is a real option for connecting HubSpot and
${run.target_software}.

THE BRIEF:
${briefContext(run, brief)}

WHAT WE ALREADY ESTABLISHED:
- API verdict for ${run.target_software}: ${target.api_verdict} — ${target.api_verdict_reason}
- Webhooks available: ${target.webhooks_available ? "yes" : "no"}
- Native HubSpot marketplace app: ${marketplace.native_app_exists ? "exists" : "none found"}

Check whether Make (make.com) publishes an app or connector for ${run.target_software},
and whether Zapier does. For each, confirm it exists by finding its actual connector or
app page, and capture the triggers and actions relevant to the records in scope — a
connector that only supports creating records is no use for a read-heavy sync.

Then reach a verdict:
- viable: at least one platform has a connector that could carry the described sync.
- not_viable_no_connector: neither platform can reach this system, so middleware is
  off the table. Say what the client must do instead — request API access from the
  vendor, agree a file or SFTP exchange, or accept a manual process.
- not_applicable: the target has a usable API of its own, so middleware is a
  convenience trade-off rather than a necessity. Note the trade-off honestly.

Where a connector exists, note the task/operation cost implications at this record
volume, and the latency floor — Zapier and Make polling intervals depend on plan tier,
which matters if the rep asked for real-time.`,
  };
}
