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

## Run it locally

No cloud accounts and no API keys needed. Prerequisites: Node.js ≥ 20, Docker,
and the [Supabase CLI](https://github.com/supabase/cli#install-the-cli).

```bash
npm run local:setup      # starts local Supabase, migrates, writes env files
npm run local:dev        # worker on :8080, web app on :3000
```

Press **Sign in as the local demo user** on the login page — a password sign-in
as a seeded admin, shown only against a local Supabase. (To sign in as someone
else, use the email form and collect the magic link from the local mail catcher
at http://127.0.0.1:54324.) Research runs in offline demo mode — the
findings are placeholders and label themselves as such — so everything except
the research itself is exercised for real. Add an `ANTHROPIC_API_KEY` to
`apps/worker/.env` to switch to real research.

Full walkthrough, including sample discovery material to feed it:
[`docs/local-prototype.md`](docs/local-prototype.md).

Configuring it by hand instead:

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
cp apps/worker/.env.example apps/worker/.env   # then fill both in
supabase db push                               # migrate a hosted project
npm run dev:worker
npm run dev:web
```

## Checks

```bash
npm run typecheck
npm run lint
npm test
```
