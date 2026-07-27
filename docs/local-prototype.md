# Running the whole app locally

You can run a working prototype entirely on your own machine — no Supabase
account, no Vercel, no Anthropic API key, no admin approval. Everything runs in
Docker on localhost.

Two pieces make this possible:

- **The Supabase CLI** runs real Postgres, Auth, Storage and Realtime in Docker.
  It is the same software as the hosted product, so RLS policies, magic-link
  sign-in, private buckets and live progress all behave for real.
- **Offline demo mode** (already built in) makes the four research steps return
  clearly-marked placeholder findings instead of calling Claude.

What that gets you: sign-in, the intake wizard, file uploads, text extraction
from .docx/.pdf/.txt, the signal-confirmation screen, live progress, the
recommendation logic, generated .docx and .xlsx downloads, mapping edits,
regeneration, the admin cost view, and run deletion.

What it does **not** get you: actual research. The findings are placeholders and
say so. See [Turning on real research](#turning-on-real-research) below.

---

## Prerequisites

| Tool | Why | Install |
| --- | --- | --- |
| Node.js 20+ | Runs the app | https://nodejs.org |
| Docker Desktop | Runs Postgres, Auth, Storage, Realtime | https://docs.docker.com/get-started/get-docker/ |
| Supabase CLI | Starts and migrates the local stack | `brew install supabase/tap/supabase` (macOS) · [other platforms](https://github.com/supabase/cli#install-the-cli) |

On Windows, do all of this inside WSL. Docker Desktop needs to be running before
you start — the setup script checks and tells you if it isn't.

---

## Setup

```bash
git clone <this repo>
cd Integration-Assistant

npm run local:setup
```

That one command:

1. checks Node, Docker and the Supabase CLI, naming anything missing
2. installs dependencies
3. starts the local Supabase stack (the first run pulls a few hundred MB of
   container images — later runs take seconds)
4. applies all four migrations: tables, RLS policies, storage buckets, the job
   queue function
5. writes `apps/worker/.env` and `apps/web/.env.local` with the local Supabase
   URL and keys, and turns offline demo mode on

It reads the keys from `supabase status` rather than hardcoding them, and it
won't overwrite an existing `.env` without asking. Both files are gitignored.

Then start the app:

```bash
npm run local:dev
```

Worker on `http://localhost:8080`, web app on `http://localhost:3000`. Output
from both is prefixed so you can tell them apart. `Ctrl-C` stops both.

---

## Signing in

Local Auth sends no real email. It catches everything in a local inbox instead.

1. Open http://localhost:3000 and enter any email address — `you@example.com`
   works, and so does your real one. Nothing leaves your machine.
2. Open the mail catcher at **http://127.0.0.1:54324**.
3. Open the message and click the magic link.

You're now signed in as a `rep`, which is what everyone gets by default. To see
the admin screen and every run:

```bash
npm run local:admin -- you@example.com
```

Reload the page and the admin link appears. (The user row only exists after
you've signed in once, so run this second, not first.)

---

## A full run, end to end

Sample discovery material is in `docs/samples/` — a fictional plumbing company
with a ServiceTitan ↔ HubSpot integration. The two files deliberately
contradict each other on one point so the confirmation step has real work to do.

1. **New run.** Client name: `Northwind Plumbing & HVAC`.
2. **Upload** both files from `docs/samples/`.
3. **Fill the brief.** Target software `ServiceTitan`; direction *The other
   software → HubSpot*; objects *People / contacts*, *Companies* and *Deals /
   opportunities*; frequency *Within a few minutes*; volume *10,000 – 100,000*;
   no in-house technical owner.
4. **Submit.** The status moves to processing. The worker picks the run up within
   a second or two; you'll see it in the worker's log output.
5. **Confirm the signals.** The extraction step lists what it found and flags the
   conflict between the transcript and the notes. Resolve it and continue.
6. **Watch the progress.** The four research steps tick through live — that's
   Realtime, the worker and Postgres working together.
7. **Review the results.** Recommendation, requirements document, mapping table.
   Edit a mapping row, then regenerate and confirm your edit survived.
8. **Download both files.** They open in Word and Excel.
9. **Check the admin screen** for the run's cost (zero in offline mode).
10. **Delete the run,** then confirm in Studio (http://127.0.0.1:54323) that the
    rows are gone.

In offline mode the whole run takes seconds instead of minutes.

### The documents are marked as fake

Every offline finding carries `[OFFLINE DEMO DATA — not real research]`,
confidence is forced to `low`, and an open question states outright that nothing
was researched. That's deliberate — a scoping document that *looked* researched
but was invented is the worst thing this app could produce, so an offline
document is made obviously unusable rather than merely unreliable.

Use offline runs to test the app. Never send one to a client.

---

## Turning on real research

Once you have an Anthropic API key, edit `apps/worker/.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
LLM_OFFLINE_DEMO=
```

Restart the worker. Nothing else changes — same local database, same uploads.
A real run makes seven Claude calls with web search and takes a few minutes.

Two things worth knowing before the first real run: it costs money (roughly a
few dollars per run, shown on the admin screen), and `LLM_OFFLINE_DEMO` is
ignored entirely when `NODE_ENV=production`, so the flag can't follow you into a
deployment.

---

## Day-to-day commands

```bash
npm run local:dev                       # worker + web together
npm run dev:worker                      # just the worker
npm run dev:web                         # just the web app
npm run local:setup                     # re-check setup, rewrite env files
npm run local:setup -- --reset          # wipe the local database, replay migrations
npm run local:admin -- you@example.com  # grant admin
npm run local:verify                    # check database privileges
npm run local:stop                      # stop the Supabase containers
npm run local:reset                     # wipe the database and replay migrations

npm run typecheck && npm run lint && npm test
```

Local data survives `local:stop` and a machine restart. `--reset` and
`local:reset` are the only things that delete it.

---

## When something looks wrong

**`docker info` fails / "Docker is not running."** Start Docker Desktop and wait
for the whale icon to settle, then re-run setup.

**Ports already in use (54321–54324, 3000, 8080).** Something else is on them —
another Supabase project is the usual culprit. `supabase stop --all` (or change
the ports in `supabase/config.toml`, and the URLs in the generated env files to
match).

**The magic link says the redirect isn't allowed.** `supabase/config.toml`
already allow-lists `http://localhost:3000/auth/confirm`. If you changed the
port, add the new URL there and run `npm run local:setup -- --reset`.

**No email in the mail catcher.** Check the web app's terminal output for the
sign-in error, and confirm `NEXT_PUBLIC_SUPABASE_URL` in `apps/web/.env.local`
matches what `supabase status` reports.

**A run sits in "processing" forever.** The worker isn't running or can't reach
the database. Its terminal output will say which; `curl localhost:8080/ready`
should return `{"ready":true}`.

**`permission denied for function claim_next_run`,** repeating in the worker log.
Your database is missing the privilege grants in migration `0005_grants.sql`.
Pull the latest code and replay the migrations:

```bash
git pull
npm run local:reset      # deletes local runs and uploads
npm run local:verify     # confirms every role has what it needs, and no more
```

`npm run local:verify` is worth running after any migration change — grants don't
show up in the unit tests, only against a real database.

**"Missing required environment variable: SUPABASE_URL".** The env files weren't
generated. Run `npm run local:setup`.

**The schema looks out of date after pulling new migrations.** `npm run
local:reset` replays them all. It deletes local runs and uploads.

---

## What this doesn't prove

A green local run tells you the app works. It does not tell you the deployment
works. Still untested until you deploy for real: hosted Supabase Auth redirects,
Vercel's environment variables, the worker's host and its shutdown grace period,
Realtime over the public internet, and — until you add a key — research quality,
web-search citations, and real costs.

Deployment is covered in [`deployment.md`](deployment.md).
