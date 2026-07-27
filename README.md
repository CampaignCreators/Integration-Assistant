# Integration Assistant

Turns sales-discovery material into three things for a HubSpot integration:

1. a **recommended data mapping table**, covering every object involved
2. an **Integration Brief** for the client (.docx)
3. a **Developer Handoff** for whoever builds it (.docx)

You describe the integration, it drafts the mapping — asking for anything it
genuinely needs first — you edit and confirm the table, and it writes the two
documents from what you confirmed.

## Running it

You need Node.js 20 or newer. Nothing else — no database, no Docker, no accounts.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Without an Anthropic API key it runs in **demo mode**: the flow works end to end,
but the output is placeholder text and says so on every line. To get real
analysis, put a key in `.env.local`:

```bash
cp .env.example .env.local
# then edit it: ANTHROPIC_API_KEY=sk-ant-...
```

Restart, and the demo banner disappears.

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

**Nothing is stored on a server.** Uploaded files are read, turned into text, and
handed straight back to the browser; the draft lives in `localStorage`. Discovery
material contains client PII, and the safest place for it is not on a server at
all. The flip side: clearing your browser data clears your draft.

## Layout

```
app/            page + three API routes (extract, analyze, documents)
components/     the four steps of the UI
lib/            schemas, prompts, the Claude call, mapping edits, .docx builders
samples/        fictional discovery material for trying it out
archive/        previous versions, kept for reference only
```

`lib/` holds the logic worth testing and `components/` holds only presentation,
which is why the test suite needs no browser.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Deploying

It is a standard Next.js app, so Vercel needs no configuration beyond
`ANTHROPIC_API_KEY`.

One caveat worth knowing: a real analysis can run past a minute when web search
is enabled, so the two Claude-backed routes declare `maxDuration = 300`. Vercel
honours that on Pro; on Hobby, functions are capped at 60 seconds and a long
analysis will be cut off. Either use Pro, or set `ENABLE_WEB_SEARCH=false` to keep
runs short.

Deploying without `ANTHROPIC_API_KEY` makes the API routes return 503 rather than
serving demo output — a document that looks researched but is invented is the
worst thing this tool could produce.
