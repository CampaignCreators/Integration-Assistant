# CC Integration App — Implementation Plan

Status: **awaiting approval** (drafted 2026-07-27). Follows `docs/build-spec.md`
Build Phases 0 → 5. No code is written until this plan is approved.

## 0. Current repo state & restructure proposal

The repo today is a Google AI Studio prototype: Vite + React SPA (`src/`), a single
Express server that serves the Vite build (`server.ts`), Gemini SDK, and module design
docs under `docs/01…09_*.md`. This conflicts with the mandated stack (Next.js on
Vercel, Express **worker**, Supabase, **Claude**).

**Proposal:** restructure into an npm-workspaces monorepo and retire the prototype
code, keeping its docs as design reference:

```
apps/web/          Next.js 15 (App Router, TypeScript, Tailwind) — deployed to Vercel
apps/worker/       Express + TypeScript worker — deployed to Render/Railway/Fly
packages/shared/   Shared TypeScript types + zod schemas (brief, findings, mappings, statuses)
supabase/          config.toml + versioned SQL migrations + seed
docs/              build-spec.md, this plan, prototype module docs (kept as reference)
archive/prototype/ Current Vite/Gemini prototype moved here (deleted later if unwanted)
.github/workflows/ CI: lint + typecheck + test on PR
```

The prototype's `src/types.ts` shapes (SaaSObject, ObjectMapping, MarketplaceOption)
and the nine module docs inform the UI, but nothing is imported from it — the Gemini
dependency is dropped entirely.

## 1. Cross-cutting technical decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Job queue | Postgres-backed: `runs.status='queued'` + worker poll loop using `FOR UPDATE SKIP LOCKED`; per-step checkpoints in `run_events` | No extra infra (no Redis); retryable/idempotent per spec §10; Supabase is already the source of truth |
| Web search | Anthropic's built-in `web_search` + `web_fetch` server tools on the Claude API | One API key instead of two; citations come back structured, satisfying the grounded-only guardrail. `WEB_SEARCH_API_KEY` kept in `.env.example` as an optional Tavily/Brave fallback behind a `SearchProvider` interface |
| LLM | `@anthropic-ai/sdk`, `claude-sonnet-5` for research/extraction steps (tool use + structured output via forced tool call), model configurable per step via env | Latest capable model; per-step schemas enforce the JSON contracts in spec §8 |
| Auth | Supabase Auth email magic-link (internal users), `@supabase/ssr` in Next.js; worker verifies the Supabase JWT (JWKS) on every route and enforces ownership/role | Matches spec §7; SSO can be layered on later without code change |
| Status flow | `draft → queued → extracting → awaiting_confirmation → researching → generating → complete / failed` | Spec §5.2 requires rep confirmation of extracted signals **before** research begins |
| UI updates | Supabase Realtime subscription on `run_events` + `runs`, with polling fallback | Spec §4.1/§9 processing screen |
| File parsing | `mammoth` (docx), `unpdf` (pdf), custom `.vtt`/`.srt` parser, plain read for `.txt`/`.md` | Pure-JS, container-friendly |
| Doc generation | `docx` for the requirements document, `exceljs` for `.xlsx`, CSV emitted directly | De-facto standard Node libraries |
| Uploads | Browser → Supabase Storage via signed upload URL (path `uploads/{run_id}/{uuid}-{filename}`), then registered with worker `POST /runs/:id/uploads` | Keeps big files off both Vercel and the worker |
| Cost tracking | `usage_events` table (tokens in/out, model, step, estimated USD) written by the worker per LLM call | Spec §10 cost control; summed per run for admin UI |
| Secrets | `.env` gitignored (already is); `apps/web/.env.example` + `apps/worker/.env.example` with placeholders only | Spec §11.1 |

## 2. Phase plans

### Phase 0 — Foundation

*Exit criteria: a signed-in user can create an empty run.*

**Files/modules**

- Root: `package.json` (workspaces), `tsconfig.base.json`, `.github/workflows/ci.yml`,
  updated `README.md`, prototype moved to `archive/prototype/`.
- `packages/shared/`: `types.ts` (Run, Brief, Upload, ResearchFinding, FieldMapping,
  Deliverable, RunEvent, enums), `schemas.ts` (zod), `index.ts`.
- `apps/web/`: Next.js scaffold; `middleware.ts` (auth guard);
  `app/(auth)/login/page.tsx`; `app/(app)/dashboard/page.tsx` (run list + "New run");
  `lib/supabase/{client,server}.ts`; `lib/worker-api.ts` (typed fetch to worker with
  session JWT); minimal "create empty run" action.
- `apps/worker/`: `src/index.ts` (Express bootstrap), `src/middleware/auth.ts` (JWT
  verify + role/ownership), `src/routes/runs.ts` (`POST /runs`, `GET /runs`,
  `GET /runs/:id`), `src/lib/supabase.ts` (service-role client), `src/queue/poller.ts`
  (skeleton claim loop, no steps yet), `GET /health`.
- `supabase/migrations/0001_init.sql`.

**Supabase schema (0001)**

- Tables: `users` (mirrors `auth.users` via trigger; `role` enum rep/reviewer/admin),
  `runs`, `uploads`, `brief`, `extracted_signals`, `research_findings`,
  `field_mappings`, `deliverables`, `run_events`, `usage_events` — all with
  `created_at`/`updated_at` + touch trigger.
- RLS on every table: rep = own runs (via `run_id → runs.user_id`), reviewer/admin =
  all; worker uses service role.
- Storage buckets `uploads` and `deliverables` (private) with path-scoped policies.

**API routes:** `POST /runs`, `GET /runs`, `GET /runs/:id`, `GET /health`.

### Phase 1 — Intake

*Exit criteria: run captures files + structured brief.*

**Files/modules**

- `apps/web/app/(app)/runs/new/`: wizard shell + steps — `UploadStep` (multi-file,
  progress bars, remove-before-submit, type validation), `BriefStep` (target software
  autocomplete from a curated common-tools list, description, directionality,
  objects multi-select, frequency, optional trigger event + volume bucket — all
  plain-language with tooltips), `ReviewStep`, submit action.
- `apps/web/app/(app)/runs/[id]/page.tsx`: run detail with status.
- `apps/worker/src/routes/uploads.ts` (`POST /runs/:id/uploads` — registers storage
  objects, validates ownership); `src/extract/text.ts` (docx/pdf/vtt/srt/txt/md →
  plain text, stored on `uploads.extracted_text`).
- Signed-upload-URL endpoint (worker) so the browser uploads directly to Storage.

**Schema changes:** none — `uploads.status` and `runs.title` were already included in
`0001_init.sql`, so Phase 1 needs no new migration.

**API routes added:** `POST /runs/:id/upload-url`, `POST /runs/:id/uploads`,
`DELETE /runs/:id/uploads/:uploadId`, `PUT /runs/:id/intake`, `POST /runs/:id/submit`.

**Deliberate deviation from spec §7.** The spec sketches a single
`POST /runs` that both creates a run and enqueues processing, with "upload ids" in the
body. That ordering is not implementable: files must be uploaded to Storage under a
`<run_id>/` prefix *before* they can be registered, so the run id has to exist first.
The implemented flow splits it into `POST /runs` (creates a `draft`),
`PUT /runs/:id/intake` (autosaves brief answers between wizard steps so a refresh
never loses work), and `POST /runs/:id/submit` (validates the brief, flips status to
`queued`). All mutating intake routes reject a run that is no longer `draft`.

### Phase 2 — Research core

*Exit criteria: findings persisted with sources.*

**Files/modules**

- `apps/worker/src/pipeline/`: `runner.ts` (step framework: checkpointing to
  `run_events`, idempotent skip-if-done, retry with backoff), `steps/extractSignals.ts`
  (LLM → `extracted_signals`, conflict flags vs. brief, `is_inferred` marking),
  `steps/researchHubSpot.ts`, `steps/researchTarget.ts` (verdict:
  available/limited/none + docs link), `steps/checkMarketplace.ts` (listing, publisher,
  pricing, supported objects/direction, reviews summary, explicit limitations),
  `steps/assessMiddleware.ts` (runs only when target API is limited/none; encodes the
  "middleware still needs an API/connector" constraint).
- `apps/worker/src/llm/`: `client.ts` (Anthropic SDK wrapper: forced-tool structured
  output, web search/fetch tools, usage logging), `prompts/` (one per step),
  `schemas/` (zod → JSON Schema per step output).
- `apps/web/app/(app)/runs/[id]/`: signal-confirmation UI (confirm/resolve conflicts →
  releases run from `awaiting_confirmation` to `researching`), processing screen with
  live step progress from `run_events` (Realtime), findings view with citations.

**Guardrails implemented here:** every finding row requires ≥1 source URL or is
downgraded to low-confidence/open-question; no fabricated endpoints (prompt + schema
`source_url` requirements).

**Schema changes (0003):** `runs.status` extended; `research_findings.confidence`;
`extracted_signals.conflict_with_brief boolean`.

**API routes added:** `POST /runs/:id/confirm-signals`.

### Phase 3 — Outputs

*Exit criteria: downloadable deliverables produced.*

**Files/modules**

- `apps/worker/src/pipeline/steps/decideApproach.ts` — the spec §5.4 decision tree
  encoded in code (deterministic), with an LLM-written rationale + confidence and
  uncertainty drivers.
- `steps/buildMappings.ts` — rows from objects-in-scope × standard properties on both
  sides; unknowns flagged (`notes`), never guessed; match/dedupe keys proposed
  (email/domain/external id).
- `apps/worker/src/render/requirementsDoc.ts` (`docx`, spec §5.5.1 section order),
  `render/mappingSheet.ts` (`exceljs` + CSV), `render/upload.ts` (Storage +
  `deliverables` rows with version).
- `apps/worker/src/routes/deliverables.ts` (`GET /runs/:id/deliverables/:kind` →
  signed URL).
- `apps/web` results screen: recommendation summary + confidence, marketplace
  assessment, mapping table (read-only this phase), download buttons.

**Schema changes (0004):** `runs.recommended_approach`, `runs.confidence`,
`deliverables.version` default handling.

**API routes added:** `GET /runs/:id/deliverables/:kind`.

### Phase 4 — Review & polish

*Exit criteria: reviewer can correct + regenerate.*

**Files/modules**

- Editable mapping table in `apps/web` (inline edit, add/remove rows) →
  `PATCH /runs/:id/mappings`.
- `POST /runs/:id/generate` (rebuild .docx/.xlsx from current DB state, bump version)
  and `POST /runs/:id/reprocess` (re-run pipeline reusing uploads + brief).
- Admin area `apps/web/app/(app)/admin/`: user role management, per-run and aggregate
  usage/cost (from `usage_events`), concurrent-run cap setting.
- Worker: concurrency cap enforcement in the poller; per-run cost rollup.

**Schema changes (0005):** `app_settings` (max_concurrent_runs), `field_mappings`
edit audit columns (`edited_by`, `edited_at`).

**API routes added:** `PATCH /runs/:id/mappings`, `POST /runs/:id/generate`,
`POST /runs/:id/reprocess`, admin routes (`GET /admin/usage`, `PATCH /admin/users/:id`).

### Phase 5 — Hardening

*Exit criteria: reliable end-to-end run.*

- Step retries with exponential backoff + max attempts; poison-run handling
  (`failed` + resumable from last good step); idempotency audit of every step.
- Run deletion (`DELETE /runs/:id`): DB rows + Storage objects (uploads and
  deliverables) — PII requirement from spec §10.
- Observability: `pino` structured logs on the worker, error surfacing in the UI
  (failed step + message on the processing screen).
- Tests: `vitest` — unit (decision tree, vtt/srt parser, mapping builder, JWT/ownership
  middleware, schema validation), integration (pipeline end-to-end against mocked
  Claude + a seeded Supabase), plus CI wiring.
- Accessibility pass (keyboard nav, contrast, labels) and copy review.
- Deployment docs: Vercel setup, Render/Railway worker setup, Supabase migration
  workflow, env var checklist.

## 3. Verification & environments note

This sandbox has no live Supabase project or provisioned API keys, so:

- Migrations, RLS policies, and seeds live in `supabase/` and are runnable via the
  Supabase CLI (`supabase db reset`) — I'll validate SQL locally where possible.
- Each phase ships with `tsc --noEmit`, ESLint, and (from Phase 2) unit tests passing.
- True end-to-end verification (auth → run → deliverables) requires a dev Supabase
  project + `ANTHROPIC_API_KEY`; env var placeholders are provided in `.env.example`
  files and the phase summaries will call out exactly what to configure.

## 4. Open questions (answer before/with plan approval)

1. **Prototype code:** OK to move the current Vite/Gemini app to `archive/prototype/`
   (dropping the Gemini dependency), keeping `docs/01…09` as reference? Or delete it
   outright?
2. **Web search:** OK to use Anthropic's built-in web search/fetch tools (single API
   key) with a pluggable external-search fallback, rather than a separate search API?
3. **Auth method:** email magic-link for v1 (Google SSO later)?
4. **Dev Supabase project:** will you provide dev project credentials during the
   build, or should end-to-end verification wait until deployment?
