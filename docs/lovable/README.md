# Prototyping in Lovable

**Read this first: Lovable cannot import this repository.** Its GitHub integration
is export-only — connecting a project *creates a new repository*, and the docs say
plainly that importing an existing one is not supported. So there is no file you
can add here that makes Lovable pick this codebase up.

There is also a stack mismatch underneath that. This app is Next.js — server
components, route handlers, middleware. Lovable builds a client-side React app and
puts server-side logic in **Supabase Edge Functions**. Even if import existed, the
three API routes would not transfer as-is.

What that means in practice: Lovable will build a **second** app, not continue this
one. That is fine for prototyping — it is what Lovable is good at — as long as you
go in knowing there are two codebases and that merging between them is manual.

This folder is what to feed it so the prototype comes out close to what already
exists, rather than starting from a blank prompt.

---

## What to do

**1. Start a new Lovable project** and paste [`01-product-spec.md`](01-product-spec.md)
as the opening prompt. It describes the four steps, the exact rules that matter,
and the copy already written.

**2. Attach the screenshots** in [`screenshots/`](screenshots) — Lovable takes
images as design references, and they will get you closer to the current look than
any description.

**3. Paste [`02-design-tokens.md`](02-design-tokens.md)** so it uses Campaign
Creators' colours rather than the default shadcn palette.

**4. Give it [`sample-mapping.json`](sample-mapping.json)** and ask it to build the
mapping table against that fixture. The table is the hard part of the UI, and this
lets it be built and reviewed before any AI call is wired up.

**5. When you get to the backend**, read [`03-backend-notes.md`](03-backend-notes.md).
Lovable connects to an existing Supabase project, which is the one real bridge
between the two codebases — but be careful, because it designs schemas from
descriptions rather than reading yours.

---

## Which parts transfer, and which do not

| | Transfers | Why |
| --- | --- | --- |
| Supabase schema | ✅ | Lovable connects to an existing project. `supabase/schema.sql` still applies. |
| Colour palette | ✅ | Plain hex values, in `02-design-tokens.md`. |
| Mapping data shape | ✅ | Plain JSON, in `03-backend-notes.md`. |
| Prompts to Claude | ✅ | Plain text in `lib/prompt.ts`; copy them into an edge function. |
| React components | ⚠️ | Same library, different conventions — Lovable uses shadcn/ui, this uses hand-rolled components. Read for logic, not for reuse. |
| API routes | ❌ | Next.js route handlers. Must be rewritten as edge functions. |
| Middleware and auth wiring | ❌ | Next-specific. Lovable does its own. |
| `.docx` generation | ⚠️ | The `docx` library works in a browser, but the builders in `lib/documents.ts` assume Node. See `03-backend-notes.md`. |

## Worth deciding before you start

Two codebases doing the same job diverge quickly. Decide which one is the product:

- **Lovable is the product.** Fastest path to something people can use; this repo
  becomes reference. You would be re-implementing the mapping editor, document
  generation and prompts in a new stack.
- **Lovable is a sketchpad.** Use it to try layouts and flows quickly, then bring
  the decisions back here by hand. Nothing is thrown away, but nothing transfers
  automatically either.
- **Neither.** The Next.js app already does all four steps end to end. If what you
  want is a different *look*, that is a smaller job in this repo than a rebuild.

I would only reach for Lovable here if the goal is exploring a substantially
different UX, rather than polishing this one.
