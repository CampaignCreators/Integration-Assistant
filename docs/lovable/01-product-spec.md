# Product spec — paste this into Lovable as the opening prompt

Everything below the line is written to be pasted as-is.

---

Build an internal tool for a marketing agency called **Integration Assistant**.

A salesperson has just come off a discovery call with a client who wants some other
piece of software connected to HubSpot. This tool turns their notes into three
things: a recommended field-by-field data mapping, an integration brief for the
client, and a handoff document for the developer who will build it.

It is one page with four steps that appear in sequence. Each step is a card with a
numbered badge; the badge turns into a tick when that step is done.

## Step 1 — Describe the integration

Heading: **Describe the integration**
Hint: *Two things are required: the software and the use case. Everything else helps but is optional.*

Four inputs:

1. **What software should connect to HubSpot?** — single line.
   Hint: *The other system in the integration — e.g. ServiceTitan, Shopify, NetSuite.*
   Placeholder: `ServiceTitan`
2. **What should the integration do?** — textarea.
   Hint: *Describe it the way you'd explain it to the client. What moves, which way, and why it matters.*
3. **Anything else worth knowing?** — textarea, optional.
   Hint: *Optional. Paste notes, requirements, or a snippet of a call — anything not in a file.*
4. **Supporting documents** — multi-file upload, optional. Accepts `.txt`, `.md`,
   `.vtt`, `.srt`, `.docx`, `.pdf`. Max 10 files, 20 MB each. Show each uploaded
   file with how many characters of text were read from it, and a Remove link.

Button: **Draft the mapping**, disabled until the software and the use case both
have content. When disabled, show *Name the software and describe the use case to
continue.* next to it.

`.vtt` and `.srt` files are transcripts — strip the cue numbers and timestamps
before using the text, keeping only the dialogue.

## Step 2 — Questions, but only when needed

After Draft the mapping, the analysis either returns a mapping table or comes back
asking for more. If it asks, show a card headed **A few things are missing**, a
one-line reason, then each question with:

- the question in plain language
- a smaller line explaining what it changes about the mapping
- two to four **clickable suggested answers** as chips (clicking one selects it,
  clicking again deselects)
- a free-text box: *Or type your own answer*

Button: **Continue**. Note beneath: *Anything you leave blank becomes a recorded
assumption.*

**Only one round of questions, ever.** After the user answers, the tool must
produce a mapping — it may not ask again. Anything still unknown is written down as
an assumption instead. This matters: a tool that keeps asking is worse than one
that states its assumptions plainly.

## Step 3 — Review the mapping

Heading: **Review the mapping**
Hint: *Edit anything that looks wrong, then confirm the logic.*

A plain-language summary, then the mapping **grouped by object** — one section per
object pair, e.g. "Contacts ↔ Customer". Each group has:

- the purpose of that object in one line
- an editable **Match on** field and a **Direction** dropdown (→ HubSpot, → other
  system, Two-way)
- a table with columns: *<other system> field*, *HubSpot property*, *Direction*,
  *Key*, *Req*, *Transform*, *Notes*, and a × to delete the row
- every cell editable in place
- **Add a field** below the table
- **Remove object** at the top right

Below the groups: **Assumptions** and **Open questions** as lists, each item
removable with a ×.

**Fields the analysis could not resolve are the point of this screen.** Where a real
field name on the other system could not be established, the value is the literal
string `UNKNOWN`. Highlight those cells in the warm accent colour so they are
impossible to miss. Never replace them with a guess — a plausible invented field
name costs a developer an afternoon.

Before confirming, show warnings — not blocks — for:

- an object with no fields mapped
- an object with no row marked as the match key ("so a sync could create duplicates")
- how many fields are still unresolved

Then: **Confirm table logic**, with *Confirming unlocks the brief and the developer
handoff.* beside it. Once confirmed the table becomes read-only, shows **Table logic
confirmed**, and offers **Reopen for editing**.

## Step 4 — Documents

Two download cards, each generating a `.docx`:

- **Integration Brief** — *For the client: what the integration achieves, what is in
  scope, what they need to provide.*
- **Developer Handoff** — *For whoever builds it: the confirmed mapping object by
  object, transforms, edge cases, and what is still unresolved.*

Note beneath: *Each download is written from the table you confirmed, so edits you
made are reflected.*

The brief names objects, never individual fields or endpoints. The handoff carries
the full field tables, one per object, plus a section listing every unresolved field
as work still to do.

## Rules that are easy to miss

- **The confirm gate is real.** Documents cannot be generated until the table is
  confirmed.
- **Editing an object's name carries its rows with it.** Rows belong to an object by
  the pair of names; renaming without moving the rows orphans them.
- **Empty rows are dropped on confirm**, so a row someone added and never filled in
  does not reach the documents.
- Uploaded files are read for their text; the analysis runs on that text plus the
  three written fields.
- Work in progress should survive a refresh.

## Tone

The user is a salesperson, not a developer. No API jargon in any label or hint. Say
"What software should connect to HubSpot?" rather than "Target system". Warnings
explain the consequence — "so a sync could create duplicates" — rather than naming
the rule.
