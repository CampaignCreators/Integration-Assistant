# Archive

Two earlier attempts at this tool, kept for reference. **Neither is built, tested,
linted, or deployed** — they are excluded from the app's TypeScript, ESLint and
Vitest configuration, so nothing in here can break the live app.

Look here for prior decisions, prompt wording, or the HubSpot object research.
Don't import from it.

| Folder | What it was |
| --- | --- |
| `v0-gemini-prototype/` | The original AI Studio prototype. Vite + a small Express server, single-file React app, Gemini-based. |
| `v1-supabase-worker-app/` | A full build to a written spec: Next.js on Vercel, an Express worker for the long-running research job, Supabase for Postgres/Auth/Storage/RLS, a seven-step research pipeline with web search, a deterministic recommendation tree, .docx + .xlsx output, an admin cost view, and 170 tests. |

## Why v1 was set aside

It worked, and the parts that were hard were hard for real reasons — the research
job genuinely outlives a serverless function, so it needed a worker; multi-user
access to client PII genuinely needs row-level security.

But those reasons came from a spec, not from use. In practice one person needed to
turn a call transcript into a mapping table and two documents, and reaching that
point meant Docker, a Supabase stack, four migrations, magic-link email, a mail
catcher, a service-role key, and a worker process — every one of which was a place
to get stuck, and several of which did get stuck.

The current app does the same job with `npm install && npm run dev`. It gives up
multi-user history, server-side persistence, and deep multi-step research to do it.
If those come back as real requirements, `v1-supabase-worker-app/` is where the
working implementations of them live — particularly:

- `apps/worker/src/llm/client.ts` — tool-forced structured output, `pause_turn`
  resumption, refusal handling
- `apps/worker/src/pipeline/decide.ts` — the recommendation decision tree
- `supabase/migrations/` — schema, RLS policies, and the privilege grants that
  turned out to be necessary
- `docs/build-spec.md` — the original specification
