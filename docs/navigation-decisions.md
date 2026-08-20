# Navigation, table and text rules

_Designally Platform · final (prototype v2.3)_

## One landing page, one list, no tabs

**Rewritten 20 August 2026, asked for.** The page had two zones — cards for work
blocked on the team, then a table of everything else — and both are gone. What
follows the greeting is a roster: every running project, one to a line, and
nothing else. The four things this page does are see the running projects,
create one, reach the archived ones, and read the notifications.

**The list.** Ordered with the projects that need somebody first. Each row is a
button and carries three things:

| | |
|---|---|
| the mark | an accent dot, on the rows with something waiting, hung in the margin so every client name starts on the same vertical |
| the name | client · package, the package quieter and on the same line |
| the sentence | what has arrived, and when the link shuts — "3 answers, last one 2 days ago · closes 26 Aug", or "5 answers · closed 18 Aug" |

**The dot has a legend, and it is the line above the list**, which counts the
marked rows in words. A bare glyph needs one; see below.

**It was a three-column table** — Project, Answers, Latest — until 20 August
2026. PRODUCT.md names that shape in its anti-references, and the table needed a
`data-label` hack to survive a phone, a hidden caption to say rows could be
pressed, and a hint above them reading "click any project to open it". All three
existed to make a table behave like a list of buttons.

**Who answered went with it.** The Answers column named them — "Khun Tanawat
+2" — and the row now spends that space on the date the survey shuts, which
decides whether anybody can still answer at all. The names are in the project.

**Notifications — the bell, on the toolbar's trailing edge.** It holds what was
in *Needs you*: one row per project with something outstanding, each a client
name and a sentence. Derived from current state, so there is no unread and
nothing stored, and nothing is ever sent — see PRODUCT.md principle 1. **The
rows open the project rather than acting**, because every action they could
offer is already in the project sheet.

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
as identity. The slot holds the date and nothing else.

**The scroll handover went on 20 August 2026.** The slot used to swap the date for
**"Needs you · 1"** once the greeting passed under the bar — the HIG's large-title
pattern, earning its place because the list runs long and the answer to *is there
anything I have to do* scrolled away with the greeting. The bell answers the same
question better: it holds the count at every scroll position rather than only past
one, it can be pressed, and what it opens is the work. Keeping both would have put
one number in two places four inches apart.

**The date leaves the bar below 560px.** The bell took the width it was surviving
on and "Thursday 20 August" ellipsised to "Thurs…". This is a phone; the day is in
the status bar an inch above.

**Trailing** — the notification bell, then More, fixed space, then **New survey** last. One primary action, on the trailing
edge, as the HIG asks; Sign out used to sit after it, so the bar ended on the least important
control in the app. Sign out and Past projects are in More.

**No background of its own.** The bar is the page's parchment, and the hairline appears only once
content is under it. It was a hardcoded `rgba(245, 245, 247, 0.8)` behind a 20px blur — a cool grey
that is not in this brand, on a warm page.

**Toolbar controls are symbols. Everything else is words.** The HIG: *"Prefer simple,
recognizable symbols for items instead of text, except for actions like edit that aren't
well-represented by symbols,"* and *"Prefer system-provided symbols without borders."* Three marks
carry the whole team app — the back **chevron**, the **chain link** for Copy link, and the
**ellipsis** for More — each with a tooltip and an accessible name. Copy link turns into a tick
for two seconds, and says "Link copied" into a live region, because a swapped glyph is silent.

The primary action keeps its words: `New survey`, `Review insights`, `Write the insights again`. The
HIG's own exception is actions a symbol does not represent, and a prominent action with a label
is what it shows everywhere.

**The no-star rule below is not reversed by this, it is scoped.** It was aimed at *status* — a
mark beside a name, which needs a legend because nothing teaches it. These three are *controls*,
and every phone and window on the machine teaches them. The test is whether a first-time user
would need a key: a star meaning "decision maker" fails it, an ellipsis meaning "more" does not.
Anything inside the menu, where there is room for a sentence, stays in words.

**Every sheet has the same bar.** Back · title · actions, and back has the leading edge to
itself: *"Elements that let people return to the previous document … appear at the far leading
edge, followed by the view title,"* and *"Group navigation controls and critical actions like
Done, Close, or Save in dedicated, familiar, and visually distinct sections."* It was a text
**Close** pill on the *trailing* edge until 17 August 2026 — wrong word, wrong side, and grouped
with the things you can do here rather than with the way out. It is the survey's own 52px disc
with the shared chevron.

**Back is a step, not a dismissal.** The chevron promises a place behind this one, so there has to
be one: the answers sheet and the insights return to the project they were opened from. Insights
opened from anywhere but a project have no project behind them and go back to the page. Before the
chevron they all dropped you on the landing page, which cost two clicks to get back to where you
were.

On the project sheet the trailing edge is **Copy link** — the action taken
often enough to stay visible, and until 17 August 2026 there was no way to copy the link from
here at all — then More holding *Close collection* or *Reopen*, and *Archive project*, which
confirms inside the menu rather than closing it. Nothing that can be *done* to a project is
anywhere else on the sheet now; the body only describes it.

**On a phone the wordmark goes, not the title.** One row rather than two — a wrapped sticky bar
cost 105px of an 844px screen, permanently.

## Principle
Navigation holds places you can go. This product has one place; everything else is a panel opened from it.
