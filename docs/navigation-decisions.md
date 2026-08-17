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

**3 · Nothing at the foot.** There were three destinations there — *Question templates* went on
17 August 2026 because the questionnaire is fixed, an editor for something nobody edits being a
surface to maintain and a way to break rule 5; *What's coming* went the same day, a roadmap panel
inside the tool being a place to write intentions in that nobody on a five-person team reads back.
**Past projects** followed them off the page later that day, upward: it is in the toolbar's More
menu now, because reaching archived work should not mean scrolling past every live project.

**There was never a "Library" grouping.** Question templates and past projects were unrelated
tasks and were wrongly combined as tabs in one dialog; separating them is what left one standing
when the other was cut.

## No star
A status is carried in words, never a ★ beside a name. Two reasons: the star was drawn in Action Blue, which is reserved for "a person is needed here", and a bare glyph needs a legend where words do not.

The rule outlived its first case. It was written for decision-maker status, which the questionnaire stopped asking at question version 3 — the branding team's own reading is that a survey usually has one respondent, so there is rarely anyone to rank. The Answers column now names who answered instead, and says **"nobody named"** rather than leaving the cell blank.

## One colour per line
No line of text carries two colours. Emphasis comes from weight only. Colour still differentiates across separate lines and columns — never within one.

## The toolbar

Built against Apple's HIG for toolbars, 17 August 2026, and against parts of it deliberately.

**Leading** — the wordmark, then one title slot. The HIG says not to title a window with the app
name, and it is right that the *title* slot is not where a mark belongs; the mark stays beside it
as identity. The slot holds the date while the greeting is on screen and hands over to
**"Needs you · 1"** once it scrolls under the bar — the HIG's large-title pattern, and the reason
it earns its place is that the projects table runs long and the answer to *is there anything I have
to do* used to scroll away with the greeting.

**Trailing** — More, fixed space, then **New survey** last. One primary action, on the trailing
edge, as the HIG asks; Sign out used to sit after it, so the bar ended on the least important
control in the app. Sign out and Past projects are in More.

**No background of its own.** The bar is the page's parchment, and the hairline appears only once
content is under it. It was a hardcoded `rgba(245, 245, 247, 0.8)` behind a 20px blur — a cool grey
that is not in this brand, on a warm page.

**Words, not symbols.** The HIG prefers symbols for toolbar items. The rule below wins: a bare
glyph needs a legend where words do not.

**On a phone the wordmark goes, not the title.** One row rather than two — a wrapped sticky bar
cost 105px of an 844px screen, permanently.

## Principle
Navigation holds places you can go. This product has one place; everything else is a panel opened from it.
