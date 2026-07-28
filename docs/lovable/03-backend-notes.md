# Backend notes

For when the prototype stops being a mockup. The UI can be built entirely against
[`sample-mapping.json`](sample-mapping.json) first — none of this is needed to see
whether the flow works.

## The three server operations

This app has three route handlers. In Lovable each becomes a **Supabase Edge
Function**, since that is where it puts server-side logic.

| Route here | Does | Notes for the port |
| --- | --- | --- |
| `POST /api/extract` | Files in, plain text out | Needs `mammoth` (.docx) and `unpdf` (.pdf). Runs on Deno in an edge function — check both work there, or handle `.txt`/`.md`/`.vtt`/`.srt` only at first and add the binary formats later. |
| `POST /api/analyze` | Everything the user typed → a mapping table, or a request for more information | One Claude call with two tools; the model picks which to call. See below. |
| `POST /api/documents` | Confirmed mapping → one `.docx` | Second Claude call writes the prose; the document itself is assembled in code. |

Source for each is in `app/api/` and `lib/`. `lib/prompt.ts` holds the system
prompts and tool schemas verbatim — copy them, don't rewrite them from memory.

## How the ask-or-answer step works

`/api/analyze` gives Claude two tools and lets it choose:

- `request_more_information` — returns `{ reason, questions[] }`, each question with
  `why` and 2–4 `suggestions`
- `submit_mapping_table` — returns the full mapping

On the second call — after the user has answered — the choice is removed:
`tool_choice` is forced to `submit_mapping_table` and only that tool is passed. That
is what guarantees exactly one round of questions. Without forcing it, the model
will happily keep asking.

Web search is enabled on the first call so it can look up the other system's API
docs, which is what makes the field names real rather than invented. It also makes
the call slow — a minute or more.

## The mapping shape

Everything hangs off this. `sample-mapping.json` is a valid example.

```ts
{
  summary: string
  objects: Array<{
    hubspot_object: "contacts" | "companies" | "deals" | "tickets"
                  | "products" | "line_items" | "custom"
    hubspot_object_name: string | null   // only when hubspot_object is "custom"
    external_object: string
    purpose: string
    match_key: string
    direction: "to_hubspot" | "to_external" | "two_way"
  }>
  rows: Array<{
    hubspot_object: same enum
    hubspot_object_name: string | null
    hubspot_property: string
    external_object: string
    external_field: string      // the literal "UNKNOWN" when it could not be established
    direction: same enum
    is_match_key: boolean
    required: boolean
    transform: string | null
    notes: string | null
  }>
  assumptions: string[]
  open_questions: string[]
}
```

A row belongs to a group when its `hubspot_object` **and** `external_object` both
match the object entry. That is the one piece of logic worth getting right early:
rename an object without updating its rows and they vanish from the table.

## Supabase

`supabase/schema.sql` in this repo is the schema this app uses — one `runs` table,
RLS scoped to the owner, and a private `uploads` bucket keyed by user id. It is
verified: two users cannot read, edit, delete or forge ownership of each other's
runs or files.

**Be careful connecting Lovable to the same Supabase project.** Lovable designs
schemas from plain-language descriptions rather than reading the existing one, so
it may create its own `runs` table or alter yours. Either:

- point Lovable at a **separate Supabase project** while prototyping, or
- paste `schema.sql` in and tell it explicitly to use the existing `runs` table
  rather than creating tables

Either way, run `supabase/verify.sql` afterwards — twelve checks, all should read
`PASS`. Grants and policies are exactly the sort of thing that breaks quietly.

## The Anthropic key

Lovable stores secrets in Supabase where edge functions read them, so the key goes
there rather than in the repo or in Vercel. Same rule as here: it never belongs in
client code.

One behaviour worth keeping — this app refuses to produce documents in production
when no key is set, rather than falling back to placeholder output. A scoping
document that looks researched but was invented is the worst thing this tool can
produce, and silence is how that happens.

## Documents

`lib/documents.ts` builds both `.docx` files with the `docx` library. The structure
is assembled in code and only the prose comes from the model, which is why edits to
the table always show up in the output.

The library runs in a browser too, so generating the file client-side is a
reasonable shortcut for a prototype — it skips an edge function entirely. The
builders here assume Node (`Buffer`), so that part needs adjusting.
