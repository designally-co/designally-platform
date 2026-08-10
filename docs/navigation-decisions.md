# Navigation, table and text rules

_Designally Platform · final (prototype v2.3)_

## One landing page, three zones, no tabs

**1 · Needs you** — work blocked on the team. White cards on the parchment page, 21px client name, one sentence at 17px, one Action Blue pill each. Empty is a calm card, not a gap.

**2 · All projects — a table.** Four columns:

| Column | Contents |
|---|---|
| Project | Blue dot when the project needs the team · client name · package beneath |
| Stage | Segment meter (5 branding / 7 website) · "Analysis · 4 of 5" |
| Answers | "3 answers" · "Khun Tanawat decides", or "no decision maker named" |
| Latest | Two lines of state |

Real `<table>` markup, `th scope="col"`, keyboard-focusable rows, hairline dividers, no zebra striping, no fills. Below 820px the header is visually hidden and each row becomes a labelled block via `data-label`.

**3 · Three separate destinations** — Question templates · Past projects · What's coming. Each opens its own panel.

**There is no "Library" grouping.** Question templates and past projects are unrelated tasks and were wrongly combined as tabs in one dialog.

## No star
Decision-maker status is carried in words — "Khun Tanawat decides", "Final decision maker", "· decides". Two reasons: the ★ was drawn in Action Blue, which is reserved for "a person is needed here", and a bare glyph needs a legend where words do not.

When nobody has claimed decision authority the table says **"no decision maker named"** rather than leaving the cell blank.

## One colour per line
No line of text carries two colours. Emphasis comes from weight only. Colour still differentiates across separate lines and columns — never within one.

## Top bar
Wordmark · date · New survey. Nothing else.

## Principle
Navigation holds places you can go. This product has one place; everything else is a panel opened from it.
