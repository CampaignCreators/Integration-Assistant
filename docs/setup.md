# Setup: Supabase and Vercel

The app runs with neither. Adding them gets you saved runs, sign-in, and a URL
your colleagues can use.

| | Without Supabase | With Supabase |
| --- | --- | --- |
| Sign-in | none | email + password |
| Where work is kept | this browser only | your account, any browser |
| Uploaded originals | discarded after reading | kept in private storage |
| Setup | `npm run dev` | the steps below, once |

Deliberately **no local Supabase stack** — no Docker, no CLI, no migrations to
run, no mail catcher. You point local development at the same hosted project you
deploy against. That is what makes this a ten-minute job rather than an
afternoon.

---

## 1. Supabase (about five minutes)

**Create the project.** At [supabase.com](https://supabase.com) → New project.
Pick a region near you and save the database password somewhere; you won't need it
for this app, but you'll want it later.

**Create the schema.** Open **SQL Editor** → New query, paste the whole of
[`supabase/schema.sql`](../supabase/schema.sql), and run it. It creates the `runs`
table, its row-level security policies, the privilege grants, and the private
`uploads` storage bucket. Running it twice is safe.

**Check it.** New query, paste [`supabase/verify.sql`](../supabase/verify.sql), run
it. Twelve rows, all reading `PASS`. If any say `FAIL`, the schema didn't fully
apply — re-run `schema.sql` and check for an error in the output.

**Create your accounts.** **Authentication → Users → Add user → Create new user**.
Give it an email and a password, and tick *Auto Confirm User* so no email is sent.
Repeat for each colleague.

There is no self-signup and no magic link. That's on purpose: email delivery was
the biggest single source of trouble in the previous version of this tool, and a
handful of internal users don't need it. Anyone with a Supabase seat can add a
user in about fifteen seconds.

**Copy the two values you need.** **Project Settings → API**:

- Project URL
- `anon` / `public` key

The `anon` key is safe in a browser — row-level security is what protects the
data, and the policies you just installed restrict every row to its owner. Do
**not** use the `service_role` key anywhere in this app; it bypasses those
policies entirely.

---

## 2. Local development

```bash
cp .env.example .env.local
```

Then fill in:

```
ANTHROPIC_API_KEY=sk-ant-...            # omit for demo mode
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

`npm run dev`, open http://localhost:3000, and sign in with the account you
created. Leave the two Supabase lines out and the app reverts to
browser-only — useful for a quick try, and the fallback if Supabase is ever down.

---

## 3. Vercel

Import the repository at [vercel.com/new](https://vercel.com/new). It detects
Next.js; no build configuration needed.

Set these environment variables (all three environments):

| Variable | Value |
| --- | --- |
| `ANTHROPIC_API_KEY` | your key — **required in production** |
| `NEXT_PUBLIC_SUPABASE_URL` | project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |

Deploy. Sign in at the Vercel URL with the same account.

### Two things to know about Vercel specifically

**Function duration.** A real analysis with web search can run past a minute, so
`/api/analyze` and `/api/documents` declare `maxDuration = 300`. Vercel honours
that on **Pro**. On **Hobby** functions are capped at 60 seconds and a long
analysis will be cut off mid-request. Either use Pro, or set
`ENABLE_WEB_SEARCH=false` to keep runs short.

**A missing key fails loudly.** Deployed without `ANTHROPIC_API_KEY`, the two
Claude-backed routes return 503 rather than serving demo output. A document that
looks researched but was invented is the worst thing this tool could produce, so
it refuses instead.

---

## Which value goes where

| | Local | Vercel | Notes |
| --- | --- | --- | --- |
| `ANTHROPIC_API_KEY` | optional | required | Spends money. Set a monthly limit on it. |
| `NEXT_PUBLIC_SUPABASE_URL` | optional | optional | Not secret. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | optional | optional | Public by design; RLS enforces access. |
| `service_role` key | never | never | Bypasses RLS. This app has no use for it. |

---

## When something goes wrong

**Signed in, but the run list is empty and nothing saves.** The schema didn't
apply. Run `verify.sql`.

**"Invalid login credentials".** The user doesn't exist, or wasn't confirmed.
Check **Authentication → Users** and confirm the account.

**Redirected to `/login` in a loop.** Cookies are being dropped. Confirm the
Supabase URL is exactly as shown in Project Settings (`https://`, no trailing
slash).

**Analysis times out on Vercel.** Hobby's 60-second cap. See above.

**Uploads read fine but aren't retained.** Storage upload failed while text
extraction succeeded — deliberate, so a storage problem can't lose the text.
Check the storage policies in `verify.sql` and the function log for
`storing the original failed`.

## What I could not test for you

The schema, policies and grants were verified against a real Postgres 16,
including that one user cannot read, update, delete or forge ownership of
another's runs, and the same for uploaded files. The app was verified in both
modes, including that an unreachable Supabase sends you to the login page rather
than erroring.

What has not been exercised: a real Supabase project end to end — a real sign-in,
a real file landing in the bucket, and a real Vercel deployment. Those need your
project, and they are the first things to check once it's up.
