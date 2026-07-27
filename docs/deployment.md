# Deployment

Three pieces deploy independently: the Next.js app to Vercel, the Express worker
to a long-running container host, and the database to Supabase.

The split is not cosmetic. A research run makes seven Claude calls with web
search and takes minutes; Vercel functions are time-limited and would cut it
off. The worker owns all of that. Vercel only ever enqueues work and reads
results.

---

## 1. Supabase

One project per environment (dev and prod). Never point a dev worker at a prod
project — the service-role key bypasses row-level security entirely.

### Apply the migrations

```bash
supabase link --project-ref <project-ref>
supabase db push
```

Migrations are ordered and must run in sequence:

| File | What it adds |
| --- | --- |
| `0001_init.sql` | All core tables, RLS, storage buckets, the job-queue function |
| `0002_decision.sql` | Approach/confidence enums, the stored recommendation |
| `0003_review_and_admin.sql` | Mapping metadata, app settings, the cost view |
| `0004_hardening.sql` | Run heartbeat and orphan recovery |

### Auth

Under **Authentication → URL Configuration**, set the site URL to the deployed
Vercel URL and add `<site-url>/auth/confirm` to the redirect allow-list. Magic
links bounce without it. Add `http://localhost:3000/auth/confirm` too for local
development.

Everyone who signs in gets the `rep` role. Promote the first admin by hand:

```sql
update public.users set role = 'admin' where email = 'you@campaigncreators.com';
```

After that, admins manage roles from the app's admin screen.

### Storage

`0001_init.sql` creates the private `uploads` and `deliverables` buckets with
path-scoped policies. Nothing to do by hand — but confirm both are **not**
public, since uploads contain client PII.

### Realtime

The migration adds `runs` and `run_events` to the `supabase_realtime`
publication, which drives the live progress view. If progress appears frozen but
completes on refresh, check Realtime is enabled for the project.

---

## 2. Worker (Render, Railway, or Fly.io)

Any host that runs a persistent process. **Not** Vercel serverless.

| Setting | Value |
| --- | --- |
| Build | `npm ci && npm run build --workspace apps/worker` |
| Start | `npm run start --workspace apps/worker` |
| Health check | `/ready` |
| Node | 20 or later |

Use `/ready` rather than `/health` for the host's health check. `/health` only
says the process is up; `/ready` confirms the database is reachable and returns
503 while shutting down, so the host stops routing to a draining instance.

### Environment

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # secret — worker only, never in the browser
ANTHROPIC_API_KEY=              # secret
WEB_ORIGIN=https://<your-vercel-domain>   # CORS allow-list
PORT=8080                       # most hosts set this for you
```

Optional, with defaults that work:

```
ANTHROPIC_MODEL=claude-opus-5
MAX_CONCURRENT_RUNS=3           # also settable from the admin screen
STALE_RUN_MINUTES=20            # see "Scaling out" below
SHUTDOWN_GRACE_MS=25000
STEP_MAX_ATTEMPTS=3
WEB_SEARCH_COST_PER_1K=10       # for cost estimates only
```

### Deploys are safe mid-run

On SIGTERM the worker stops accepting connections, stops claiming runs, and
waits up to `SHUTDOWN_GRACE_MS` for in-flight runs to finish. Anything still
running past that is picked up by another worker through the heartbeat sweep,
resuming at the step it reached rather than starting over.

Set the host's shutdown grace period **above** `SHUTDOWN_GRACE_MS` so the
process is allowed to drain rather than being killed.

### Scaling out

Multiple workers are safe — runs are claimed with `FOR UPDATE SKIP LOCKED`, so
two instances never take the same one.

One constraint: `STALE_RUN_MINUTES` must comfortably exceed the slowest single
pipeline step. Set it too low and a worker will treat a live run as abandoned
and start a second copy. 20 minutes is generous for the current steps; raise it
if you increase `STEP_MAX_ATTEMPTS` or the effort level.

---

## 3. Web app (Vercel)

Import the repo and set the root directory to `apps/web`. Vercel detects
Next.js; the monorepo needs no special build command.

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=       # public by design; RLS enforces access
NEXT_PUBLIC_SITE_URL=https://<your-vercel-domain>
WORKER_BASE_URL=https://<your-worker-host>   # server-side only
```

`WORKER_BASE_URL` must **not** be `NEXT_PUBLIC_` — the browser never talks to
the worker directly. Requests go through Next.js route handlers, which attach
the caller's Supabase session so the worker can check ownership.

Preview deployments get their own URL, so either add each preview URL to the
Supabase redirect allow-list or accept that sign-in only works in production.

---

## Which key goes where

| Key | Worker | Web | Notes |
| --- | --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | ❌ | Bypasses RLS. The single most sensitive value in the stack. |
| `ANTHROPIC_API_KEY` | ✅ | ❌ | Spends money. Put a monthly limit on it. |
| Supabase anon key | ❌ | ✅ | Safe in a browser; RLS does the enforcing. |
| Supabase URL | ✅ | ✅ | Not secret. |

If the service-role key ever reaches the browser bundle, rotate it immediately
in the Supabase dashboard — anyone holding it can read and write every row.

---

## Verifying a deployment

1. `GET <worker>/ready` returns `{"ready": true}`.
2. Sign in to the web app; the magic link lands back on the dashboard.
3. Start a run, upload a short transcript, submit. The status reaches
   **Needs your review** within a minute or two.
4. Confirm the signals. The processing view should tick through the research
   steps live — that exercises Realtime, the worker, and the Claude API together.
5. Download both documents from the results screen.
6. Check the admin screen shows a cost for the run.
7. Delete the run, then confirm in the Supabase Storage browser that its folder
   is gone from both buckets.

Step 7 matters: it is the PII deletion path, and the only way to know it works
is to look in the bucket.

## When something goes wrong

- **A run sits in a working state.** Its worker died. Another worker adopts it
  within `STALE_RUN_MINUTES`; the run's events will show it being picked back up.
- **A run failed.** The run page names the step that failed and offers a retry
  that keeps the completed steps. The worker logs carry the full error against
  the run id.
- **Tracing a report.** Every response carries `x-request-id`, and the worker
  logs it against each request. Ask for the id, or find it by run id in the logs.
