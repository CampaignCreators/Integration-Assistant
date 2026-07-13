# TDD Builder — Project Plan

> A standalone web app that turns a HubSpot deal into a pre-filled Technical Design Document, so SE time goes to judgment instead of transcription.
>
> **Spine:** HubSpot deal & ticket data → structured TDD model → section editor → formatted `.docx` export.
>
> This plan operationalizes the *TDD Builder — Planning Document* and is informed by a review of the Integration-Assistant codebase (this repo), which serves as **reference material** for the new app — patterns to copy, not code to extend.

Confidence tags mirror the TDD's own convention: **Confirmed** · **Working** (assumed, unverified) · **To validate** (needs a real test before relying on it).

---

## 1. Overview & core idea

Most of Band 1 already exists as structured data in HubSpot before an SE opens the template. A deal carries its name, client, and owner; through its line items it carries the contracted scope and commercial terms; its associated tickets carry the open work and handoff items. The app reads that, assembles every section it can populate with high confidence, and drops the SE into an editor to supply what HubSpot can't — the narrative, the key decisions, the risks, the ceilings.

This **inverts today's flow**: instead of starting from a blank template and hunting through HubSpot to fill it, you start from a deal and refine a draft. It automates the retrieval patterns already run by hand — the ticket → deal → line-item walk used for SOW generation, and `search_crm_objects` with `filterGroups` on `hs_pipeline_stage` for ticket lookups.

**Governing scoping rule — catalog-first, custom-as-product.** As the app assembles scope, it resolves each ticket against the standard HubSpot product catalog first: a ticket a default product covers becomes that product's line item. Only when no standard product fits does the app spin up a custom product as its own SOW line item, carrying an explicit time/effort estimate. This keeps the bulk of scope on known, flat-rate products and isolates bespoke work — priced, bounded, and visible.

- **Primary user:** a single SE, architected to extend to the Campaign Creators SE team.
- **Tool scope:** Band 1 (Approval) + Band 2 (Build Contract) — the sections the SE authors and stubs.

## 2. MVP scope ceiling

The one-line scope ceiling everything else is measured against:

> **Given a HubSpot deal ID, the app pulls the deal, its company, its line items, and its associated tickets; resolves each ticket against the product catalog (custom work flagged as its own product with a time/effort estimate); and produces an editable TDD with Front Matter, §2 Scope, §6 Commercial, and §11 Open Items pre-filled, exportable to a `.docx` that matches the master template.**

Everything else is Phase 2 and beyond.

## 3. What HubSpot fills vs. what the SE fills

The heart of the design — and the honest part. HubSpot populates target-side and commercial sections strongly, but it cannot supply the source system's schema or design judgment.

### Strong pulls (the MVP wins)

| TDD section | HubSpot source | Confidence | Who finishes |
| :--- | :--- | :--- | :--- |
| Front Matter | Deal name → project name; associated company → client; deal owner → authored-by | Working | App pre-fills; SE confirms |
| §2 Scope | Each ticket resolved against the product catalog (catalog-first); matched standard products + custom products → In-scope list | Confirmed | App proposes the product mix; SE adds Out-of-scope / Deferred |
| §6 Operating Model & Commercial | Standard + custom product line items → commercial table; recurring maintenance line = "Accepted"; monthly band from recurring price; custom products carry a time/effort estimate | Confirmed | App fills; SE sets the ceiling and confirms estimates |
| §11 Open Items & Handoff Register | Associated tickets → register rows; status → Open / In-progress / Resolved; "DH In Progress" stage flags what's live | Confirmed | App fills; SE assigns blocks-build Y/N |
| §12 Data Model (target) | Target portal's object & property definitions via the properties API | Working | App seeds target schema; SE trims |
| §13 Field Mapping (target side) | Same properties feed the valid-target dropdown | Working | App offers targets; source side manual |
| §17 Worked Examples | Real contact / company / deal pulled as a sample-input fixture for the happy path | To validate | Highest-leverage section — **prototype early** |

Tickets play two roles: as **requirements**, each ticket is the unit resolved against the product catalog, feeding §2 and §6; as **open work**, the same tickets feed the §11 handoff register. A custom product's time/effort estimate rides on its line item for the internal build view; the client-view export can present it as a priced deliverable without exposing raw hours (Working).

### SE-authored sections (app templates the structure, SE authors the content)

§1 Executive Summary · §2a Ceilings · §3 Source of Truth & freeze point · §4 Data Handling · §5 Non-Functional · §7 Key Decisions · §8 Assumptions · §9 Risks · §14–16 Matching / Sync / Lifecycle.

**Exposed dependency (Working — assumed, unverified):** the pulls above only fire if deals carry the right structured fields. Project type, complexity tier, sync direction, and hosting model are not standard deal properties today — a small set of custom deal properties feeding the TDD must be settled **before Phase 1** (see §7, Decisions).

## 4. Architecture

Data flow: **HubSpot API → TDD model (structured) → editor (web UI) → `.docx` export.**

| Layer | Responsibility |
| :--- | :--- |
| **Fetch layer** | Wraps the existing manual retrieval patterns. Given a deal ID, pulls the deal, associated company, contacts, tickets, and line items; (Band 2) the target portal's object/property schema via the properties API. Includes the **deal-readiness check** (see Risks). |
| **TDD model** | Structured representation of the 27 sections with band and tier flags, the ceilings table, and the Applicability Matrix. **Single source of truth** for the in-progress doc. |
| **Tier / matrix engine** | Applies the rubric (bidirectional or bundled migration → T3; multiple objects or real transformation → T2; else T1) and auto-shows/hides sections per the matrix. The framework enforcing its own rules. |
| **Editor** | Section-by-section, pre-filled where data exists, surfacing confidence flags and guardrail checks (every ceiling bounded or flagged; every open item owned). |
| **Export** | Renders a `.docx` matching the master template. A client-view toggle outputs Band 1 only and hides internal confidence tags. |

## 5. Tech stack (Working — adjust to taste)

| Concern | Choice | Rationale |
| :--- | :--- | :--- |
| Framework | **Next.js** (React + TypeScript) | API routes replace a separate Express server; single deployable; matches the PDF's recommended stack |
| HubSpot access | **Private-app token**, server-side, via `@hubspot/api-client` (or raw v3 REST) | Fastest single-user start; token never reaches the browser; swap to OAuth app when the team adopts it (Phase 3) |
| Export | **`docx`** npm library | Programmatic `.docx` that can be diffed against the master template |
| Storage | **Local/browser first** (e.g. localStorage / file save-load of the TDD model JSON) | Follows the auth & audience decision; a small Postgres/Supabase instance only when multi-user (Phase 3) |
| AI (deferred) | Gemini or Claude via a server route, structured output | Phase 3 only, scoped to §1 / §17 drafting and product-match suggestions |

## 6. Phased roadmap

Each phase delivers standalone value and has explicit acceptance criteria.

### Phase 0 — Foundation: "a blank-but-correct TDD generator"

| # | Task |
| :--- | :--- |
| 0.1 | Scaffold the new repo: Next.js + TypeScript, lint/typecheck, unit-test runner |
| 0.2 | Define the **TDD model** types: 27-section registry with band (1/2) and tier (T1/T2/T3) flags, ceilings table, Applicability Matrix, per-section confidence tag and fill-source metadata |
| 0.3 | Build the section registry as data (titles, order, band/tier applicability, "who fills" defaults) |
| 0.4 | Build the `.docx` export layer: TDD model → document matching the master template; keep the export mapping in **one versioned module** (template-drift mitigation) |
| 0.5 | Minimal shell UI: create a blank TDD, view sections, export |

**Accept:** a blank-but-correct TDD exports to `.docx` and matches the master template section-for-section.

### Phase 1 — MVP: "deal in → pre-filled TDD out" (the whole reason to build it)

| # | Task |
| :--- | :--- |
| 1.1 | Settle the **pre-Phase-1 decisions** (§7 below) — especially the custom deal-property set |
| 1.2 | HubSpot fetch layer (server-side): deal → associated company, contacts, tickets, line items; private-app token auth |
| 1.3 | **Deal-readiness check**: validate required properties/associations before pulling; report gaps instead of generating a hollow doc |
| 1.4 | **Catalog-first ticket resolution**: resolve each ticket against the product catalog; unmatched work spins up a custom product line item with a manual time/effort estimate |
| 1.5 | Auto-fill mappers: Front Matter, §2 Scope, §6 Commercial, §11 Open Items — each populating the TDD model with confidence tags |
| 1.6 | Section editor: pre-filled where data exists, confidence flags surfaced, SE-authored sections templated with prompts |
| 1.7 | Source-system manual input form (first-class, not an afterthought) |

**Accept:** the MVP one-liner in §2 is satisfied end-to-end against a real deal in the portal.

### Phase 2 — Framework enforcement: "the framework policing itself"

| # | Task |
| :--- | :--- |
| 2.1 | Tier / matrix engine: apply the T1/T2/T3 rubric from deal data; auto-show/hide sections per the Applicability Matrix |
| 2.2 | Guardrail validation: every ceiling bounded or flagged; every open item owned; export blocked or warned on violations |
| 2.3 | Band-2 schema pull: target portal object & property definitions via the properties API → seed §12; feed §13's valid-target dropdown |
| 2.4 | §17 worked-example seeding: pull a real contact/company/deal as a sample-input fixture — **prototype this early; it is tagged To validate and is the highest-leverage section** |
| 2.5 | **Data Synchronizations Map** (from Integration-Assistant Module 09): per-object sync-scope matrix — object, direction (bidirectional / source→HubSpot / HubSpot→source), frequency (real-time / hourly / daily) — captured in the editor and rendered into §14–16 Matching / Sync / Lifecycle |
| 2.6 | **Source API feasibility capture** (custom-integration scoping): auth method, webhook availability & verification, rate limits, pagination for the source system — part of the manual source-side input (task 1.7), feeding §5 Non-Functional and §15 Sync design |

**Accept:** changing deal tier inputs correctly re-shapes the visible sections; a ceiling left unbounded is flagged; §12/§13 seed from a live portal.

### Phase 3 — Polish & scale: "shareable, governable, team-ready"

| # | Task |
| :--- | :--- |
| 3.1 | Client-facing export: Band 1 only, confidence tags hidden, custom products presented as priced deliverables without raw hours |
| 3.2 | Changelog / re-approval tracking on the TDD model |
| 3.3 | Optional AI drafting — **only** §1 Executive Summary narrative and §17 expected-output prose — plus AI-suggested product matches & effort estimates |
| 3.3a | **Discovery Call Notes ingestion** (from Module 09): upload a call transcript; auto-parsed pain points and business constraints seed §8 Assumptions and §9 Risks as suggestions the SE accepts or discards — reuses Integration-Assistant's transcript-analysis endpoint pattern (`server.ts`) |
| 3.4 | Multi-user: OAuth app replaces the private-app token; hosted storage (Postgres/Supabase); Google Docs export option |

AI sits in Phase 3 deliberately — the HubSpot spine delivers without it, and it assists only the two sections data can't fill well.

## 7. Decisions to lock before Phase 1

An accepted default sets the build's scope ceiling.

| Decision | Options | Suggested default | Why it matters now |
| :--- | :--- | :--- | :--- |
| Auth model | Private-app token / OAuth app | **Private app** | Ties to personal-vs-team; private app starts fastest |
| Custom deal properties | Add tier / project-type / sync-direction / hosting as deal props? | **Add a minimal set** | Required for auto-fill to fire — decide the property set first |
| Output target | `.docx` only / + Google Docs | **`.docx` first** | `.docx` matches the template exactly; Docs fits Workspace later |
| Storage / state | Local / hosted DB | **Local** | Follows the auth & audience decision |
| Source-system input | Manual form / uploaded schema | **Manual form** | HubSpot can't supply the source half — must be deliberate |
| Custom-product effort estimate | Manual entry / AI-suggested | **Manual** | Bespoke work needs a defensible number; AI suggestion is a later add |

## 8. Risks & mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **HubSpot data completeness** (highest) | Sparse deal properties or inconsistent line items = weak auto-fill | Define the required property set; run the **deal-readiness check** before pulling |
| **Source-system blind spot** | A HubSpot-only spine can't populate the source half of integrations/migrations | Treat source-side as first-class manual input (task 1.7), not an afterthought |
| **Template drift** | Export stops matching the master template as it evolves | Keep the export mapping in one versioned module, checked against the template (task 0.4) |
| **Product catalog gaps** | A thin/stale catalog forces work into custom products and erodes the catalog-first benefit | Keep the catalog current and granular; periodically promote recurring custom builds into standard products |

## 9. What to borrow from Integration-Assistant (this repo)

The TDD Builder is a new app, but this codebase has proven patterns worth copying — and two hard gaps it does **not** cover.

**Patterns to copy:**

- **Multi-section document assembly** — `src/components/RequirementsDoc.tsx`: builds a ~16-section document from app state in a single memoized generator (`fullDocumentMarkdown`) and splits it for preview by `## ` headers (`previewSections`). The closest existing relative of the TDD generator; the same state-→-sections shape applies, upgraded from a Markdown string to the structured TDD model.
- **Schema / mapping models** — `src/types.ts`: `Field` (with `hubspotDefaultField` — exactly the deal-property ↔ doc-field mapping hook), `SaaSObject`, `ObjectMapping`, `FieldMapping`. A solid starting vocabulary for §12/§13 structures; `HUBSPOT_OBJECT_PRESETS` in `src/data.ts` lists the standard HubSpot objects.
- **Server endpoint with structured AI output** — `server.ts` (`POST /api/analyze-transcript`): server-side key handling, strict `responseSchema`, client fallback. The template for Phase 3 AI drafting routes and, structurally, for the HubSpot fetch route.
- **Export/download idioms** — `src/components/ExportPanel.tsx` and `RequirementsDoc.tsx`: Blob + `URL.createObjectURL` download, clipboard copy, JSON/Markdown toggles. Reusable for saving/loading the TDD model JSON alongside the `.docx`.
- **State plumbing** — `App.tsx`: lifted state with typed handlers (`handleApplyPreset`, `handleUpdateMapping`) showing how fetched data cascades into all modules.

**Gaps it does not cover (from-scratch builds):**

1. **HubSpot API layer** — no HubSpot client, token handling, or `api.hubapi.com` call exists anywhere in this repo.
2. **`.docx` generation** — exports here are Markdown/JSON only; no `docx`/PDF library is installed.

## 10. Custom integration scoping (adapted from Integration-Assistant Module 09)

Integration-Assistant's Integration Requirements Document generator (`docs/09_integration_requirements_document_generator.md`, built in `src/components/RequirementsDoc.tsx`) is the closest existing relative of the TDD Builder's output layer: it compiles all configuration context into a client-facing SOW. Its custom-integration-scoping chapters map directly onto the TDD and are adopted as follows:

| Module 09 concept | TDD Builder adoption | Where it lands |
| :--- | :--- | :--- |
| **Executive Context Summary** (briefing overview, tech-stack alignment, integration strategy) | Template scaffolding + prompts for the SE-authored narrative; Phase 3 AI drafting assists here and only here (with §17) | §1 Executive Summary |
| **Data Synchronizations Map** (records, synced loops, interval schedules) | A per-object sync-scope matrix — object, direction, frequency — captured in the editor as first-class structured data, not prose (task 2.5) | §14–16 Matching / Sync / Lifecycle |
| **Granular Map Specifications** (property keys, data-type configurations) | Field-level mapping with explicit data types and type-safety checks; the target side seeds from the properties API (task 2.3), the source side from manual/feasibility input | §12 Data Model, §13 Field Mapping |
| **Discovery Call Notes** (auto-parsed pain points, business constraints) | Transcript upload → suggested assumptions and risks the SE accepts or discards (task 3.3a) | §8 Assumptions, §9 Risks |
| **Requirements Sign-off** (standardized scopes preventing scope dilution) | The TDD's own conventions carry this: accepted defaults set scope ceilings, guardrail validation (task 2.2), and changelog / re-approval tracking (task 3.2) | §2a Ceilings, changelog |
| **Interactive export controls** (print, download, copy) | `.docx` download is primary (Phase 0); client-view Band-1 toggle (task 3.1) plays the role of Module 09's executive-presentation layout | Export layer |

Two scoping aspects Module 09 treats as core are promoted into the TDD Builder's source-side story, since custom integrations are exactly where HubSpot cannot supply the other half:

- **Source API feasibility** — auth method, webhooks, rate limits, pagination — captured with the manual source-system input (tasks 1.7, 2.6) so §5 Non-Functional and §15 Sync design state real constraints rather than placeholders.
- **Sync directionality & frequency per object** — feeds the tier rubric directly (bidirectional → T3 signal, task 2.1), tying the scoping matrix to the framework-enforcement engine.

## 11. Verification strategy

- **Export fidelity (Phase 0):** automated check diffing the generated `.docx` section structure against the master template; re-run on every export-mapping change.
- **Golden deal (Phase 1):** maintain one known-good deal in the portal (complete properties, line items spanning standard + custom products, tickets in multiple stages) as the end-to-end fixture; the MVP acceptance test runs against it.
- **Unit tests:** tier rubric (T1/T2/T3 classification), catalog-resolution logic (standard match vs. custom-product creation), guardrail checks (unbounded ceiling, unowned open item), readiness check.
- **§17 prototype spike (early Phase 2):** validate the worked-example pull against a real record before depending on it — it is tagged *To validate*.
