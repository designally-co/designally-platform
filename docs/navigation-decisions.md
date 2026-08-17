# Navigation, table and text rules

_Designally Platform · final (prototype v2.3)_

## One landing page, three zones, no tabs

**1 · Needs you** — work blocked on the team. White cards on the parchment page, 21px client name, one sentence at 17px, one Action Blue pill each. Empty is a calm card, not a gap.

**2 · All projects — a table.** Three columns:

| Column | Contents |
|---|---|
| Project | Accent dot when the project needs the team · client name · package beneath |
| Answers | "3 answers" · who answered — "Khun Tanawat", or "Khun Tanawat +2" |
| Latest | Two lines of state |

There was a **Stage** column — a segment meter reading "Analysis · 4 of 5". It went on
17 August 2026 with the kick-off, and it was the weakest column before that: five stages for
a project that is either collecting answers or has a summary, and four of the five moved
because somebody remembered to move them. The Latest column already says the true thing.

Real `<table>` markup, `th scope="col"`, keyboard-focusable rows, hairline dividers, no zebra striping, no fills. Below 820px the header is visually hidden and each row becomes a labelled block via `data-label`.

**3 · One destination** — Past projects. It opens its own panel.

There were three. *Question templates* went on 17 August 2026 because the questionnaire is
fixed — an editor for something nobody edits is a surface to maintain and a way to break rule 5.
*What's coming* went the same day: a roadmap panel inside the tool is a place to write intentions
in, and nobody in a five-person team reads their own roadmap from a dialog.

**There was never a "Library" grouping.** Question templates and past projects were unrelated
tasks and were wrongly combined as tabs in one dialog; separating them is what left one standing
when the other was cut.

## No star
A status is carried in words, never a ★ beside a name. Two reasons: the star was drawn in Action Blue, which is reserved for "a person is needed here", and a bare glyph needs a legend where words do not.

The rule outlived its first case. It was written for decision-maker status, which the questionnaire stopped asking at question version 3 — the branding team's own reading is that a survey usually has one respondent, so there is rarely anyone to rank. The Answers column now names who answered instead, and says **"nobody named"** rather than leaving the cell blank.

## One colour per line
No line of text carries two colours. Emphasis comes from weight only. Colour still differentiates across separate lines and columns — never within one.

## Top bar
Wordmark · date · New survey. Nothing else.

## Principle
Navigation holds places you can go. This product has one place; everything else is a panel opened from it.
