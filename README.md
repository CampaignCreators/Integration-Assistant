# Integration Assistant

Turns sales-discovery material into three things for a HubSpot integration:

1. a **recommended data mapping table**, covering every object involved
2. an **Integration Brief** for the client (.docx)
3. a **Developer Handoff** for whoever builds it (.docx)

You describe the integration, it drafts the mapping — asking for anything it
genuinely needs first — you edit and confirm the table, and it writes the two
documents from what you confirmed.

## Running it

You need Node.js 20 or newer.

```bash
npm install
cp .env.example .env.local     # then add your Anthropic key
npm run dev
```

Open http://localhost:3000.

With no Anthropic key it runs in **demo mode**: the flow works end to end, but the
output is placeholder text and says so on every line.

## Supabase and Vercel

Both are optional, and the app is the same either way:

| | Without Supabase | With Supabase |
| --- | --- | --- |
| Sign-in | none | email + password |
| Where work is kept | this browser only | your account, any browser |
| Uploaded originals | discarded after reading | private storage |
| Setup | none | paste one SQL file, add two env vars |

There is **no local Supabase stack** — no Docker, no CLI, no migrations to run.
Local development points at the same hosted project you deploy to Vercel against.

Setting both up, start to finish: **[`docs/setup.md`](docs/setup.md)**. It takes
about ten minutes, and `supabase/verify.sql` tells you whether it worked.

## How it works

Four steps on one page:

| Step | What happens |
| --- | --- |
| 1. Describe | Name the software, describe the use case, optionally paste notes and upload transcripts (.txt, .md, .vtt, .srt, .docx, .pdf) |
| 2. Answer | If a gap would change the mapping's shape, it asks — with suggested answers — before drafting anything |
| 3. Review | The mapping arrives grouped by object. Edit any cell, add or remove rows and objects, then **Confirm table logic** |
| 4. Download | The brief and the handoff, written from the confirmed table |

Three things are deliberate:

**It asks at most one round of questions.** After that it commits and records what
it had to assume. A tool that keeps asking is worse than one that states its
assumptions plainly.

**Unresolved fields stay unresolved.** Where a real field name on the other system
could not be established, the row says `UNKNOWN`, the editor highlights it, and
the handoff lists it under work still to do. Inventing a plausible field name
costs a developer an afternoon.

**Your data is yours alone.** With Supabase configured, every run is scoped to its
owner by row-level security, and uploads live in a private bucket keyed by user id
— verified against a real Postgres, including that one user cannot read, edit,
delete or forge ownership of another's. Without Supabase, nothing is stored
server-side at all: files are read to text and handed back, and the draft lives in
`localStorage`.

## Layout

```
app/            page, login, and the API routes
components/     the four steps of the UI
lib/            schemas, prompts, the Claude call, mapping edits, .docx builders
lib/supabase/   clients and the "is it configured" guard
supabase/       schema.sql to paste in, verify.sql to check it
samples/        fictional discovery material for trying it out
docs/setup.md   Supabase + Vercel, step by step
docs/lovable/   what to hand Lovable if you prototype there
archive/        previous versions, kept for reference only
```

`lib/` holds the logic worth testing and `components/` holds only presentation,
which is why the test suite needs no browser.

## Look and feel

The palette is Campaign Creators', taken from campaigncreators.com and defined once
in [`app/globals.css`](app/globals.css) — navy `#0e3860` carries the interface,
mint `#35ffd8` marks completed steps, and the site's coral and orange handle errors
and warnings. The generated documents use the same colours, since they go to
clients.

Some hues are accents rather than text colours: bright blue on white measures
3.6:1 and coral 3.0:1, both under the 4.5:1 needed for body text. The `-ink`
variants in that file are the least-darkened versions of those same hues that
clear 4.5:1, so brand and legibility both hold. Change a value there and it
applies everywhere.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Deploying

See [`docs/setup.md`](docs/setup.md). Two things that catch people out:

**Vercel Hobby caps functions at 60 seconds.** A real analysis with web search can
run longer, so the Claude-backed routes ask for `maxDuration = 300` — honoured on
Pro. On Hobby, either upgrade or set `ENABLE_WEB_SEARCH=false`.

**A deployment without `ANTHROPIC_API_KEY` returns 503** rather than serving demo
output. A document that looks researched but is invented is the worst thing this
tool could produce.
