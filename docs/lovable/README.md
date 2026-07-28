# Prototyping in Lovable

Two facts from Lovable's docs that sound contradictory but aren't:

- **You can't link this repository to a Lovable project.** Connecting always creates
  a *new* repository: *"You can't import an existing repository into Lovable.
  Connecting a project always creates a new repository."*
- **Lovable reads a repository it is connected to.** *"Clone the repository, edit and
  commit locally, and push. Your changes sync back into Lovable"*, and *"Pushing
  commits syncs your code into Lovable and updates the preview in the editor."*

So code does flow in — just not by pointing Lovable at an existing repo.

## The way in

1. Create a Lovable project and connect it to GitHub. It creates a new private
   repository — call it `repo-X`.
2. Clone `repo-X`, push this codebase into its **synced branch** (usually `main`).
   Only the synced branch flows back; commits on other branches won't appear until
   they're merged into it.
3. Lovable picks up those commits and the editor updates.

Worth knowing before you rely on it: reconnecting after disconnecting creates
*another* new repository, and you can't re-link the old one. Don't rename or move
`repo-X` either — that breaks the sync.

## The open question — worth ten minutes before anything else

This app is Next.js: server components, route handlers, middleware. **Whether
Lovable's editor and preview can build and run a Next.js app, I don't know.** Its
docs don't name a supported framework anywhere I could find, and I'm not going to
guess at it twice.

That single unknown decides which of the paths below is real, and you can settle it
faster than any amount of reading: make a throwaway Lovable project, push this code
to its synced branch, and see whether the preview builds. If it does, you have one
codebase. If it doesn't, you have two, and the rest of this folder is what makes the
second one quick.

## If the preview can't run it

Then Lovable builds a **second** app rather than continuing this one, and these
files are what to paste in so it starts close to what exists:

1. **[`01-product-spec.md`](01-product-spec.md)** as the opening prompt — the four
   steps, the real copy, and the rules that are easy to lose.
2. **[`screenshots/`](screenshots)** as design references — Lovable takes images.
3. **[`02-design-tokens.md`](02-design-tokens.md)** for the Campaign Creators palette
   with the contrast constraints attached.
4. **[`sample-mapping.json`](sample-mapping.json)** so the mapping table — the hard
   part of the UI — can be built and judged before any AI call is wired up.
5. **[`03-backend-notes.md`](03-backend-notes.md)** when you get to the backend.

## What transfers either way

| | Transfers | Why |
| --- | --- | --- |
| Supabase schema | ✅ | Lovable connects to an existing Supabase project. `supabase/schema.sql` still applies. |
| Colour palette | ✅ | Plain hex values, in `02-design-tokens.md`. |
| Mapping data shape | ✅ | Plain JSON, in `03-backend-notes.md`. |
| Prompts to Claude | ✅ | Plain text in `lib/prompt.ts`. Copy them; don't rewrite from memory. |
| React components | ⚠️ | Same library, different conventions. Read for logic. |
| API routes | ⚠️ | Fine if the preview runs Next.js. Otherwise rewrite as Supabase Edge Functions — see `03-backend-notes.md`. |
| `.docx` generation | ⚠️ | The `docx` library runs in a browser too, but the builders here assume Node (`Buffer`). |

## Worth deciding either way

Two codebases doing the same job diverge quickly. If the goal is exploring a
substantially different UX, Lovable is a good use of an afternoon. If the goal is
making the current app look or work better, that's a smaller job in this repo than a
rebuild — it already does all four steps end to end.
