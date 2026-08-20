# Navigation, table and text rules

_Designally Platform · final (prototype v2.3)_

## One landing page: a hero, and a sheet of projects that covers it

**Rewritten to a wireframe, 20 August 2026.** The page had two zones — cards for
work blocked on the team, then a table of everything else — and then briefly one
list. It is a hero and a sheet now.

**The hero.** A full screen: the product name, one fixed question —
*"Ready to send the client questionnaires?"* — and **New Survey**. It never
changes. It used to be a status report that read differently every week
(*"Two things need you this morning"*), and what needs a person moved into the
bell. PRODUCT.md principle 2 — an empty screen is success — moved with it: the
bell says *"Nothing is waiting"* and carries no badge when there is nothing to
carry.

**The projects sheet** rides up over the hero as the page scrolls and fills the
window. `position: sticky` on the hero with the sheet at a higher layer, so the
browser does the whole interaction — no listener, no transform, nothing that can
fall out of step with the scroll position. It comes to rest with its top against
the toolbar rather than at zero, so its own head is never behind the bar.

**Its head is sticky** under the toolbar: the heading, the search field, and the
archived disc. Without it the one control that finds a project among thirty went
off the top with the sheet.

**Search** filters the loaded projects by client name or package, in the browser.
A studio running three a month has ten, and they are already on the page.

**Archived** is a disc beside the search. It was behind the toolbar's More menu;
it belongs beside the list it is the other half of.

**A card per project**, four columns at 1280 and one at 390, with no media query —
`auto-fill` on a 250px floor does it. Each card carries:

| | |
|---|---|
| the mark | an accent dot when something is waiting, in the name's left margin so every client name starts on the same vertical |
| the name | client, with the package beneath it |
| the body | **who answered** — their names, newest first, four at most |
| the floor | what has arrived and when the link shuts: "5 answers, last one 1 day ago · closes 2 Sept", or "5 answers · closed 18 Aug" |

**The body is the people, and that is what the card's height is for.** This
product's whole subject is answers arriving, and a respondent's name is worth
more than the digit beside it — PRODUCT.md records that one respondent is the
normal case rather than the degenerate one. Everything on the card is text:
there is no imagery in this product, so a card carrying anything else would be a
loading skeleton with a name on it.

**The ground is the parchment again and the sheet is the white.** `.deck.paper`
inverted the page on 19 August so it would not flip under the reader when a
project opened. That was right for a page which *was* a stack of cards. It is a
hero with a sheet rising over it now, and under `.paper` the sheet would be the
same white as everything behind it. The modal sheets are unaffected — each
passes `surface="paper"` for itself.

**Notifications — the bell, on the toolbar's trailing edge.** One row per
project with something outstanding: a client name and a sentence. Derived from
current state, so there is no unread and nothing stored, and nothing is ever
sent — see PRODUCT.md principle 1. **The rows open the project rather than
acting**, because every action they could offer is already in the project sheet.

**Settings — the gear beside it.** Who this browser is signed in as, and Sign
out. Nothing in this product is configurable and the sheet says so rather than
inventing preferences: the questionnaire is fixed, the 14-day default lives in
code, and who may sign in is the Workspace. Sign out was in the More menu, and
that menu went when Past projects moved onto the sheet — leaving one item behind
an ellipsis, where nobody looks for it.

Built against Apple's HIG for toolbars, 17 August 2026, and against parts of it deliberately.

**Leading** — the wordmark, then one title slot. The HIG says not to title a window with the app
name, and it is right that the *title* slot is not where a mark belongs; the mark stays beside it
as identity. **The slot is empty now** — 20 August 2026.

It held the date, and swapped it for **"Needs you · 1"** once the greeting passed
under the bar, on the HIG's large-title pattern. Both went. The bell answers
*is there anything I have to do* at every scroll position rather than only past
one, it can be pressed, and what it opens is the work; and the date was
orientation every machine this runs on already provides, which had also stopped
fitting — the bell took the width it was surviving on and "Thursday 20 August"
ellipsised to "Thurs…".

**Trailing** — the notification bell, then Settings. Nothing else.

**New survey moved into the page**, under the headline that asks for it. A
toolbar's trailing edge is where the HIG puts the one primary action, and that is
right when the page has other subjects. This page has one.

**The More menu went with them.** It held Past projects, now a disc on the
projects sheet, and Sign out, now in Settings. A More menu with nothing left in
it is a menu about nothing.

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
