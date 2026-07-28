# Design tokens — paste into Lovable after the spec

Everything below the line is written to be pasted as-is.

---

Use the Campaign Creators palette, not the default theme. These are taken from
campaigncreators.com.

## Colours

| Token | Hex | Used for |
| --- | --- | --- |
| navy | `#0e3860` | Headings, primary buttons, step badges, field labels, table header text |
| navy-dark | `#0c2237` | Primary button hover |
| mint | `#35ffd8` | Completed step badge (with navy text), text selection |
| blue | `#1084ff` | Focus rings only |
| ink | `#39464e` | Body text |
| muted | `#697783` | Hints and secondary text |
| shell | `#f5f8fa` | Page background |
| line | `#ced4da` | Borders and dividers |
| navy-tint | `#e2e7ec` | Table header background |
| coral-tint / coral-ink | `#ffecea` / `#c84d42` | Error messages |
| ember / ember-tint / ember-ink | `#ff5c35` / `#ffebe7` / `#cc4a2a` | Warnings, and the highlight on unresolved `UNKNOWN` fields |
| mint-tint / teal-ink | `#e7fffa` / `#198290` | Success messages |

## Rules that keep it readable

These are not stylistic preferences — the raw brand accents fail contrast as text,
and these are the fixes.

- **Never white text on mint, blue, or coral.** Mint is far too light (white on it
  is about 1.3:1). Bright blue with white text is 3.6:1 and coral is 3.0:1, both
  under the 4.5:1 small text needs.
- **Mint is a background behind navy text**, which is 9.4:1 and the nicest
  combination in the palette. That is how the completed-step badge works.
- **Primary buttons are navy with white text** — 12:1. Not bright blue.
- **`-ink` colours are for text, the base colour is for fills and borders.** The
  `-ink` values are the least-darkened version of each hue that reaches 4.5:1.
- Bright blue is for focus rings, where contrast rules do not apply the same way.

## Component styling

- Cards: white, `1px` border in `line`, `rounded-xl`, small shadow, generous padding
- Buttons: `rounded-lg`, `text-sm`, medium weight
  - primary — navy background, white text, navy-dark on hover
  - secondary — white background, navy border, navy text
  - ghost — muted text, navy on hover, underline on hover
- Inputs: `rounded-lg`, `line` border, blue focus ring
- Checkboxes: set `accent-color` to navy, or they render in the browser's blue
- Step badges: 28px circle — navy with white number, or mint with navy tick when done
- Table headers: `navy-tint` background, navy uppercase small text
- Page: `shell` background, content max width around 1000px, centred

## Favicon

Navy rounded square, a mint circle and a white circle joined by a mint line — two
systems and the link between them.
