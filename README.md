# CC Integration App

Internal Campaign Creators tool that turns raw sales-discovery material (call
transcripts, notes, requirement docs) into a developer-ready integration scoping
package: an **Integration Requirements Document** (.docx) and a **Data Mapping
Table** (.xlsx/.csv) for a HubSpot ↔ target-software integration.

Full specification: [`docs/build-spec.md`](docs/build-spec.md) ·
Implementation plan: [`docs/implementation-plan.md`](docs/implementation-plan.md)

## Repository layout

| Path | What it is |
| --- | --- |
| `apps/web` | Next.js app (Vercel): auth, intake wizard, dashboard, results |
| `apps/worker` | Express + TypeScript worker: async research/generation pipeline |
| `packages/shared` | Shared TypeScript types + zod schemas |
| `supabase` | Postgres migrations, RLS policies, storage buckets |
| `docs` | Build spec, implementation plan, prototype module docs |
| `archive/prototype` | Retired AI Studio prototype (reference only) |

## Stack

Next.js on Vercel · Express/Node.js (TypeScript) worker on a long-running host ·
Supabase (Postgres, Auth, Storage, RLS, Realtime) · Anthropic Claude API (with
built-in web search/fetch for research).

The research/generation job runs **asynchronously on the worker** — never inside a
time-limited Vercel function. The web app enqueues a run; the worker claims it from
Postgres, processes it step by step, and writes status + results back to Supabase.

## Local development

Prerequisites: Node.js ≥ 20, a Supabase project (or `supabase start` locally).

```bash
npm install

# configure env (never commit real values)
cp apps/web/.env.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env

# apply database migrations to your Supabase project
supabase db push          # or: supabase start && supabase db reset (local)

npm run dev:worker        # Express worker on :8080
npm run dev:web           # Next.js on :3000
```

## Checks

```bash
npm run typecheck
npm run lint
npm test
```
