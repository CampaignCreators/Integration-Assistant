# CC Integration App — Build Specification

> Canonical copy of `CC_Integration_App_Build_Spec.docx`, converted to Markdown so the
> spec travels with the codebase. Saved 2026-07-27.

## 1. Executive Summary

The CC Integration App is an internal web application that lets less-technical sales
reps turn raw discovery material — call transcripts, notes, and requirement documents —
into a structured, developer-ready integration scoping package. A rep uploads their
discovery artifacts, describes in plain language which software should connect to
HubSpot, and answers a few guided questions about direction, objects, and frequency.
The app then runs an AI research-and-drafting workflow and returns two deliverables:
an **Integration Requirements Document** and a **Data Mapping Table**.

Behind the guided form, the app leverages publicly available documentation for
HubSpot's APIs and, when available, the target software's APIs. It checks whether a
native HubSpot App Marketplace integration already exists, searches for reviews and
known limitations of that native app, and — when the target system exposes no usable
API or webhooks — evaluates whether middleware such as Make or Zapier is a viable
path. The output gives the sales team a defensible, consistent scoping artifact they
can hand to a solutions engineer or to a client, without needing to understand REST
APIs themselves.

**Document purpose.** This is a build specification written to be consumed by Claude
Code in Plan Mode. It defines the product scope, the exact stack (Vercel, Supabase,
Express/Node.js), the data model, the API surface, the AI agent workflow, and the
acceptance criteria needed to plan and implement the application. Sections are ordered
so an implementation plan can be generated top-to-bottom.

### 1.1 Problem Statement

Scoping an integration today depends on a technically fluent person manually reading
transcripts, researching two sets of APIs, judging whether a marketplace connector is
"good enough," and writing up a requirements document and field mapping by hand. That
work is slow, inconsistent between reps, and does not scale. The knowledge lives with
one or two people.

### 1.2 Solution Summary

A single-purpose internal app that standardizes and largely automates integration
discovery. It captures inputs through a guided intake, performs the research
automatically, applies a consistent decision framework (native vs. custom vs.
middleware), and produces the same two artifacts every time in a predictable format.

### 1.3 Goals

- Let a non-technical rep produce a complete integration scoping package in minutes,
  unassisted.
- Standardize the output: every engagement yields the same Integration Requirements
  Document structure and Data Mapping Table format.
- Ground recommendations in current, publicly available HubSpot and target-software
  API documentation rather than guesswork.
- Automatically detect an existing native marketplace integration, surface its
  reviews, and flag limitations that may force a custom build.
- Fall back to a middleware assessment (Make / Zapier) when the target system lacks a
  usable API or webhooks.
- Keep a durable record of every scoping run for reuse, auditing, and iteration.

### 1.4 Non-Goals

- The app does not build, deploy, or run the actual integration — it only scopes and
  documents it.
- It does not write to a client's HubSpot or target system; all research is read-only
  against public documentation.
- It is not a general project-management or CRM tool; it is a focused
  discovery-to-requirements generator.
- v1 does not need multi-tenant client logins — it is an internal Campaign Creators
  tool.

## 2. Users & Personas

| Persona | Technical level | Primary need | Key interactions |
| --- | --- | --- | --- |
| Sales rep (primary user) | Low | Turn discovery notes into a credible scoping doc without help | Upload files, fill guided form, download deliverables |
| Solutions engineer / reviewer | High | Validate and refine the generated scope before client delivery | Review runs, edit/regenerate, approve |
| Sales manager / admin | Medium | Oversee usage, manage access and API keys | View all runs, manage users, monitor cost |

### 2.1 Primary User Story

> "As a sales rep, I want to upload my discovery call transcript and describe the
> software the prospect wants connected to HubSpot, so that the app produces a
> requirements document and a field mapping table I can send to my solutions engineer
> and to the client — without me needing to understand APIs."

## 3. Technology Stack

The application is built on the mandated stack below. The split keeps the AI/research
workload on a long-running Node service while the UI stays on Vercel's edge.

| Layer | Technology | Role in this app |
| --- | --- | --- |
| Frontend | Next.js (React) on Vercel | Guided intake UI, run dashboard, results viewer/downloads; server components + route handlers for light API calls |
| API / orchestration | Express + Node.js (TypeScript) | Long-running research + generation jobs, LLM orchestration, web/API research, document assembly |
| Database & auth | Supabase (Postgres) | Persisted runs, extracted fields, mappings, users; Supabase Auth for internal login; RLS for access control |
| File storage | Supabase Storage | Uploaded transcripts/discovery docs and generated .docx/.xlsx deliverables |
| AI / LLM | Anthropic Claude API | Extraction from transcripts, research synthesis, decision logic, document drafting |
| Research tools | Web search + HTTP fetch | Public HubSpot & target-software API docs, marketplace listing + reviews |
| Hosting | Vercel (frontend) + container host for Express | Vercel functions are time-limited; run the Express worker on Render/Railway/Fly or Vercel background functions |

> **Architecture note for the planner.** Vercel serverless functions have execution
> time limits that are too short for a multi-step research + generation job. Model the
> heavy work as an asynchronous job: the Next.js app enqueues a run, the Express/Node
> worker processes it in the background and writes status + results to Supabase, and
> the UI polls (or subscribes via Supabase Realtime) for completion. Do not attempt to
> run the full agent workflow inside a single Vercel request.

## 4. System Architecture

### 4.1 High-Level Flow

1. Rep signs in (Supabase Auth) and starts a new integration run in the Next.js app.
2. Rep uploads transcripts / discovery docs (to Supabase Storage) and completes the
   guided brief (target software, directionality, objects, frequency).
3. Next.js creates a run record in Supabase and enqueues a job for the Express worker.
4. The Express/Node worker runs the pipeline: extract → research HubSpot → research
   target software → marketplace + reviews check → middleware fallback → decide
   approach → generate mapping → assemble documents.
5. Worker writes structured results + generated files back to Supabase; run status
   flips to "complete."
6. UI shows the results (requirements summary + mapping table on screen) and download
   links for the .docx and .xlsx.

### 4.2 Component Diagram (textual)

```
  ┌─────────────────────────┐        ┌──────────────────────────┐
  │  Next.js on Vercel      │  REST  │  Express / Node worker   │
  │  - Auth (Supabase)      │───────▶│  - Job runner / queue    │
  │  - Intake wizard        │        │  - LLM orchestration     │
  │  - Run dashboard        │◀───────│  - Research tools        │
  │  - Results + downloads  │ status │  - Doc/xlsx assembly     │
  └───────────┬─────────────┘        └───────────┬──────────────┘
              │                                   │
              ▼                                   ▼
        ┌───────────────────────────────────────────────┐
        │  Supabase                                      │
        │  Postgres (runs, fields, mappings, users)      │
        │  Storage (uploads + generated deliverables)    │
        │  Auth + RLS + Realtime                         │
        └───────────────────────────────────────────────┘
                              │
        External:  Claude API · Web search · HubSpot & target docs · Marketplace
```

## 5. Functional Requirements

### 5.1 Input Intake

The intake is a short guided wizard. It must be usable by someone with no technical
background: plain language, sensible defaults, tooltips, and no free-text API jargon
required.

#### 5.1.1 File uploads

- Accept call transcripts and discovery documentation: `.txt`, `.md`, `.docx`, `.pdf`,
  and `.vtt`/`.srt` transcript formats.
- Multiple files per run; store in Supabase Storage keyed to the run; extract text
  server-side for the pipeline.
- Show upload progress and allow removing a file before submitting.

#### 5.1.2 Guided integration brief

Structured questions captured as first-class fields (not buried in free text) so the
pipeline and the output document can use them directly:

| Field | Prompt to the rep | Type / options |
| --- | --- | --- |
| Target software | What software should connect to HubSpot? | Text + autocomplete of common tools |
| Brief description | In a sentence or two, what should this integration do? | Short free text |
| Directionality | Which way should data flow? | HubSpot → Target · Target → HubSpot · Two-way |
| Objects | What records are involved? | Multi-select: Contacts, Companies, Deals, Tickets, Products, Line Items, Custom — both sides |
| Frequency | How often should it sync? | Real-time / webhook · Near-real-time · Hourly · Daily · Manual |
| Trigger event | What should kick off a sync? | Optional: record created/updated, stage change, form submit, etc. |
| Volume | Roughly how many records? | Optional bucket: <1k, 1k–10k, 10k–100k, 100k+ |

### 5.2 Extraction from Discovery Material

An LLM extraction pass reads the uploaded transcripts/docs and pulls structured
signals that supplement the guided brief: the systems mentioned, data entities and
specific fields discussed, stated pain points, required behaviors, edge cases, and any
constraints (compliance, timing, ownership). Extracted items are stored as structured
rows and surfaced to the rep for quick confirmation before research begins.

- Reconcile extracted signals with the guided brief; flag conflicts (e.g., rep said
  "one-way" but transcript implies two-way) for the rep to resolve.
- Never fabricate fields — only capture what appears in the source or the brief; mark
  inferred items as "inferred."

### 5.3 Research Workflow

The core value of the app. Executed by the Express worker as a sequence of tool-using
LLM steps, each grounded in publicly available information and each producing a cited,
structured result.

#### 5.3.1 HubSpot side research

- Identify the relevant HubSpot CRM objects and APIs for the selected objects
  (Contacts, Companies, Deals, Tickets, Line Items, Products, Custom Objects under
  `/crm/v3/`; associations under `/crm/v4/`).
- Determine standard vs. required properties for each object and note where custom
  properties will likely be needed.
- Capture authentication model (private app access token vs. OAuth for
  marketplace/multi-account), webhook availability, and applicable rate limits.

#### 5.3.2 Target software research

- Search for the target software's public API documentation and determine whether a
  usable REST/GraphQL API and/or webhooks exist.
- Capture available objects/endpoints, auth model, pagination, rate limits, and any
  obvious data-model mismatch with HubSpot.
- Record a clear verdict: API available (with docs link) / limited / none found.

#### 5.3.3 Native marketplace check + reviews

- Determine whether a native HubSpot App Marketplace integration exists between
  HubSpot and the target software.
- If it exists: capture the listing, publisher, pricing model, supported
  objects/direction, and search for user reviews (marketplace rating, third-party
  reviews, community threads).
- Explicitly call out known limitations — e.g., no control over synced fields, fixed
  sync direction, no custom-object support, missing activity sync — that might require
  a custom integration.

#### 5.3.4 Middleware fallback (decision logic)

If the target software exposes no usable API or webhooks, the worker evaluates
middleware before concluding a custom build is impossible:

- If the target has a public API/webhooks → native (if adequate) or custom integration
  is viable.
- If no direct API but the target is supported by Make or Zapier → recommend
  middleware; note task/operation costs and latency trade-offs.
- If no API and no middleware connector → flag as not integrable without vendor
  involvement; recommend requesting API access, file/SFTP exchange, or a manual
  process.

> **Key research constraint.** Middleware is not a way around a missing API. Make and
> Zapier still require the target system to expose an API or a supported connector; if
> neither exists, no middleware can bridge it. The app must state this plainly rather
> than recommending middleware as a universal fallback.

### 5.4 Recommended Approach Decision

The worker synthesizes the research into a single recommended approach with a
rationale and confidence level. The decision tree the app applies:

| Condition | Recommended approach | When to override |
| --- | --- | --- |
| Native marketplace app exists and covers objects, direction, and frequency | Use native integration | Reviews reveal blocking limitations → custom |
| Native app exists but limited (fields, direction, custom objects) | Native + custom supplement, or custom | If gaps are minor and acceptable → native |
| No native app, but both sides have public APIs | Custom integration | Low volume / non-technical team → middleware |
| No native app, target has no API but Make/Zapier supports it | Middleware (Make or Zapier) | High volume or true real-time → revisit custom |
| No API and no middleware connector | Not integrable as-is | Request vendor API access or file-based exchange |

### 5.5 Output Generation

#### 5.5.1 Integration Requirements Document

A generated `.docx` (and on-screen view) with a consistent structure:

1. Overview & business goal (from the brief + extracted pain points).
2. Systems in scope and their API/auth posture (HubSpot + target).
3. Directionality, objects, and sync frequency.
4. Recommended approach (native / custom / middleware) with rationale and confidence.
5. Native marketplace assessment: exists?, reviews summary, limitations.
6. Assumptions, open questions, risks, and dependencies.
7. High-level implementation notes (auth, webhooks vs. polling, rate-limit
   considerations).
8. Sources / references (links used during research).

#### 5.5.2 Data Mapping Table

A generated table (on screen + downloadable `.xlsx`/`.csv`) mapping fields between the
two systems:

| Column | Meaning |
| --- | --- |
| Source object / field | The originating system, object, and field |
| Target object / field | The destination system, object, and field |
| Direction | One-way or two-way for this specific field |
| Transformation | Type cast, format change, value mapping, concatenation, lookup |
| Required | Whether the target field is required |
| Match / dedupe key | Whether this field is used to match records |
| Notes | Custom-property need, uncertainty, or gap flag |

- Rows are inferred from the objects in scope and standard properties on each side;
  unknowns are flagged rather than guessed.
- The rep or reviewer can edit rows and regenerate the downloadable file.

## 6. Data Model (Supabase / Postgres)

Core tables. All tables carry `created_at` / `updated_at`; access is scoped with
Row-Level Security so a rep sees their own runs and admins see all.

| Table | Key columns | Purpose |
| --- | --- | --- |
| `users` | id, email, role (rep/reviewer/admin) | Internal users; mirrors Supabase Auth |
| `runs` | id, user_id, target_software, direction, frequency, status, recommended_approach, confidence | One scoping run |
| `uploads` | id, run_id, storage_path, filename, type, extracted_text | Uploaded discovery files |
| `brief` | id, run_id, objects[], trigger_event, volume, description | Structured guided-brief answers |
| `extracted_signals` | id, run_id, category, value, source_ref, is_inferred | LLM-extracted items from discovery docs |
| `research_findings` | id, run_id, side (hubspot/target/marketplace/middleware), summary, details_json, sources[] | Per-step research output with citations |
| `field_mappings` | id, run_id, source_obj, source_field, target_obj, target_field, direction, transform, required, match_key, notes | Rows of the data mapping table |
| `deliverables` | id, run_id, kind (requirements_doc/mapping_sheet), storage_path, version | Generated files |
| `run_events` | id, run_id, step, status, message, ts | Pipeline progress / audit log |

## 7. API Design (Express / Node.js)

The Express worker exposes a small REST surface consumed by the Next.js app. All
routes require a valid Supabase session JWT; the worker verifies it and enforces
role/ownership.

| Method & path | Purpose | Notes |
| --- | --- | --- |
| `POST /runs` | Create a run + enqueue processing | Body: brief fields + upload ids |
| `GET /runs/:id` | Fetch run status + results | Poll target or use Realtime |
| `GET /runs` | List runs for the user | Filter by status |
| `POST /runs/:id/uploads` | Register uploaded files | Files land in Supabase Storage first |
| `POST /runs/:id/reprocess` | Re-run pipeline after edits | Reuses uploads + brief |
| `PATCH /runs/:id/mappings` | Edit mapping rows | Reviewer corrections |
| `POST /runs/:id/generate` | Regenerate deliverables | Rebuild .docx / .xlsx |
| `GET /runs/:id/deliverables/:kind` | Signed download URL | From Supabase Storage |

### 7.1 Processing Pipeline (worker internals)

```
processRun(runId):
  1. loadRun(runId)                 // brief + uploads from Supabase
  2. extractText(uploads)           // pdf/docx/vtt -> plain text
  3. extractSignals(text, brief)    // LLM -> extracted_signals
  4. researchHubSpot(brief)         // objects, auth, webhooks, limits
  5. researchTarget(target)         // API? webhooks? docs link
  6. checkMarketplace(target)       // native app? reviews? limits
  7. assessMiddleware(target)       // if no API -> Make/Zapier viable?
  8. decideApproach(findings)       // native / custom / middleware
  9. buildMappings(objects, findings)
 10. renderRequirementsDoc() + renderMappingSheet()
 11. saveDeliverables() ; status = "complete"
  (each step writes a run_events row; failures are retryable)
```

## 8. AI & Research Orchestration

Each pipeline step is a discrete, tool-using LLM call with a tightly scoped prompt and
a required structured (JSON) output. Grounding and citation are mandatory: every
research finding stores the sources it used, and the model is instructed not to invent
endpoints, fields, or reviews.

### 8.1 Tools available to the agent

- **Web search** — locate HubSpot docs, target-software docs, marketplace listings,
  and reviews.
- **HTTP fetch** — read public documentation pages (read-only; public content only).
- **Structured-output enforcement** — each step returns JSON matching the target table
  schema.

### 8.2 Guardrails

- **Grounded-only:** findings must cite a source URL; uncited claims are marked
  low-confidence and surfaced as open questions.
- No fabrication of API endpoints, field names, pricing, or reviews.
- Confidence scoring on the final recommendation, with the drivers of uncertainty
  listed.
- **Read-only:** the app never authenticates into or writes to HubSpot or the target
  system.
- **PII care:** discovery transcripts may contain client PII — store encrypted,
  restrict via RLS, and exclude PII from any third-party calls beyond what is
  necessary.

## 9. Frontend / UX Requirements

Designed for a non-technical user: linear, guided, and forgiving. No API terminology
is required from the rep.

| Screen | Contents | Notes |
| --- | --- | --- |
| Sign in | Supabase Auth (email/SSO) | Internal users only |
| Dashboard | List of runs with status + approach | Start new run CTA |
| New run wizard | Step 1 uploads → Step 2 guided brief → review → submit | Progress bar, tooltips, defaults |
| Processing | Live step-by-step progress | Realtime updates from run_events |
| Results | Recommendation summary, marketplace assessment, editable mapping table, download buttons | Edit + regenerate |
| Admin | User management, API key/config, usage | Admin role only |

## 10. Non-Functional Requirements

| Area | Requirement |
| --- | --- |
| Security | Supabase Auth + RLS; encrypted storage; secrets in env/secret manager, never in the repo |
| Privacy | Discovery docs may contain client PII — restrict access, support deletion of a run and its files |
| Performance | A typical run completes in minutes; UI never blocks on it (async job + status) |
| Reliability | Each pipeline step is retryable and idempotent; partial failures do not lose prior results |
| Cost control | Track LLM/search usage per run; admin visibility; cap concurrent runs |
| Observability | run_events audit log + structured worker logs; error surfacing in the UI |
| Accessibility | Keyboard navigable, readable contrast, plain-language copy |

## 11. Deployment & Environments

- **Frontend:** Next.js deployed to Vercel (preview per PR, production on main).
- **Worker:** Express/Node service on a long-running host (Render, Railway, or
  Fly.io) — not Vercel serverless — or Vercel background/queue functions if kept
  within limits.
- **Database/Storage/Auth:** Supabase project per environment (dev, prod); migrations
  in version control.
- **Secrets:** Claude API key, search API key, Supabase service role key stored as
  environment secrets on Vercel and the worker host.
- **CI/CD:** Lint, type-check, and test on PR; deploy on merge.

### 11.1 Environment variables (indicative)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # worker only
ANTHROPIC_API_KEY=
WEB_SEARCH_API_KEY=
WORKER_BASE_URL=               # Next.js -> Express
```

## 12. Build Phases

| Phase | Scope | Exit criteria |
| --- | --- | --- |
| 0 — Foundation | Repos, Supabase schema + Auth + RLS, Vercel + worker skeleton | A signed-in user can create an empty run |
| 1 — Intake | Uploads to Storage, guided brief, text extraction | Run captures files + structured brief |
| 2 — Research core | HubSpot + target research, marketplace + reviews, middleware logic | Findings persisted with sources |
| 3 — Outputs | Decision, mapping builder, .docx + .xlsx generation | Downloadable deliverables produced |
| 4 — Review & polish | Editable mappings, regenerate, admin, cost tracking | Reviewer can correct + regenerate |
| 5 — Hardening | Retries, observability, PII deletion, tests | Reliable end-to-end run |

## 13. Acceptance Criteria

1. A non-technical rep can complete a run end-to-end without assistance.
2. Given a transcript naming a target software, the app determines whether that
   software has a public API and whether a native HubSpot marketplace integration
   exists.
3. When a native integration exists, the output includes a reviews summary and
   explicit limitations.
4. When the target has no API, the app correctly evaluates Make/Zapier and states
   plainly when neither is viable.
5. Every run produces a structured Integration Requirements Document and a Data
   Mapping Table, both downloadable.
6. All research findings carry source links; uncited claims appear as open questions,
   not as facts.
7. Runs, files, and deliverables persist and are retrievable later; a run can be
   deleted with its files.

## 14. Appendix

### 14.1 Reference Notes on HubSpot APIs

- CRM objects (Contacts, Companies, Deals, Tickets, Line Items, Products, Custom
  Objects) are exposed under `/crm/v3/`; associations under `/crm/v4/`.
- Auth: private app access token for a single account; OAuth 2.0 for marketplace or
  multi-account apps.
- Rate limits scale by tier; private-app daily limits are shared across apps in the
  same account (Pro ~650k/day, Enterprise ~1M/day). OAuth public apps use a
  per-account short-window limit rather than a daily cap. Confirm current numbers
  against HubSpot docs at build time.

### 14.2 Native vs. Custom vs. Middleware — rules of thumb

- Native marketplace apps install in minutes and are usually free, but often lack
  control over which fields sync, sync direction, custom objects, and activity data.
- Custom integrations fit any system with an API and support arbitrary business
  logic, at higher build/maintenance cost.
- Middleware (Make/Zapier) suits lighter, non-technical automations but still
  requires the target to have an API or a supported connector; it can hit
  cost/latency ceilings at volume.

### 14.3 Sources consulted

- HubSpot developer docs — CRM API, associations, private apps, usage
  guidelines/limits (developers.hubspot.com).
- Industry guides on HubSpot native vs. custom vs. middleware integrations
  (huble.com, kunocreative.com, integrateiq.com, syncmatters.com).
- Middleware comparisons for HubSpot (Make vs. Zapier) and their API dependency
  (superwork.co, revio.agency, outboundsync.com).
