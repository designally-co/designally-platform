# The complete flow — one page

_Designally Platform · visual version: `reference/flow-map.html`, which still draws the old
branch after step 9 and has not been redrawn_

## Three sets of hands
Every step belongs to the client, the team, or the app.

| # | Who | Step | Time |
|---|---|---|---|
| 1 | Team | Deal signed → create survey: client name, package, and the date to answer by — prefilled at two weeks, changeable, or cleared for none | 1 min |
| 2 | App | Attaches the right question blocks, makes one link, and hands it over on a sheet of its own | instant |
| 3 | Team | Send the link to the client's main contact — copy it, or let them point a camera at the code | — |
| 4 | Client | Answers; gives name, position and email; forwards the link onward | ~20 min each |
| 5 | App | Collects and counts — "3 answers so far · last one 2 days ago" | — |
| 6 | App | After the date passes, or after 5 quiet days: "enough to work with, or wait a little longer?" | — |
| 7 | **Team** | **Close and analyse** ← human decision | 5 sec |
| 8 | App | Writes the insights: agreements, conflicts, gaps, flags | ~30 sec |
| 9 | Team | Read the insights — and re-run them on whichever answers they choose | 15–20 min |
| 10 | **Team** | **Archive the project** ← human decision, whenever they judge it finished | 5 sec |

**Step 2 hands the link over on its own screen** (18 August 2026). The New survey
sheet used to grow it: three fields, then the link and the code appearing beneath
them with the fields disabled above — a form pretending to still be a form when
nothing on it could be changed any more. The survey exists by then, the token is
minted, and rule 5 has frozen the questions. What is left is one job, *send it*,
and it gets a screen that opens with the answer already on it.

Closing that sheet loses nothing: the link is on the project behind Share, in the
same control — see `src/app/sheets/link-code.tsx`, which is both places.

**Step 9 was a gate until 18 August 2026** — *Read and confirm*, with a name recorded
against it. It is not one now. The platform collects the answers and writes the
insights, and it stops there; asking a person to countersign the last thing it
produces was the app holding a door it does not own. Reading it still matters for
the reason `docs/insight-engine-spec.md` gives — the analysis mistakes two wordings
of one idea for a disagreement, especially across Thai and English — but that is
how the team works rather than a state the software enforces.

**After 8.** The team has the insights and the full answers, and the design work
begins. How they run the first meeting, what they build the deck in, and what they write down
afterwards are theirs; the platform's job ends when the insights are written.

**Retired 17 August 2026:** steps 10–12 of the older flow — the deck handoff, the kick-off
meeting, and recording what the room decided. The platform now stops at the summary. The
`decisions` table is still standing, empty, and nothing writes to it.

Both packages — Brand and Design — follow the same ten steps; only the questionnaire differs.

## Three decisions belong to the team — nothing happens on a timer
1. **Is this enough to work with?** Only a person knows whether four answers from the right people beat ten from the wrong ones.
2. **Are these insights true?** The AI can mistake two wordings of the same idea for a disagreement, especially across Thai and English.
3. **Is this project finished?** Archiving is manual. There is no automatic rule. Nothing is deleted; archived projects stay searchable.

   **Archiving a project whose survey is still open closes collection too, and
   signs it** (18 August 2026). The link already stopped working the moment the
   project was archived — `/s/<token>` tells anyone opening it that the work is
   finished — but `closed_at` stayed empty, so the record said collection had
   never been closed and nobody had ever closed it. That is rule 2 losing a gate.
   The person archiving is the person who decided to stop taking answers, so they
   sign both, at the same moment. It does **not** run the analysis: archiving is
   filing, and a paid API call fired by a menu item nobody associates with one is
   a surprise in the wrong direction. The due date is left alone — it is what the
   client was told (rule 1), and archiving before it is the ordinary case.

   Deleting does not close anything first. The cascade takes the survey with the
   project, so there is no row left to stamp; the link 404s rather than
   explaining itself, because the project it belonged to is gone.

**Including the date, from 18 August 2026.** A survey carries a date the team told the client to
answer by, two weeks out by default and editable. When it passes, two things happen: the project
appears in *Needs you*, and the link stops serving — a client arriving after it is told the
questionnaire is closed and asked to contact their project lead, who moves the date forward to let
them back in.

**One word for it, from 19 August 2026.** The screen said "The date for this questionnaire has
passed" on this arm and "This questionnaire is closed" on the other two. Rule 1 had already settled
that a date arriving and somebody pressing *Close now* are the same event to whoever is holding the
link, and that the client meets the same screen either way — so the app says the same word either
way. What still differs is the sentence under it, because the three are not the same situation:
this one is a door that can be opened again, and it is the only one that names the thing to do.

It was a prompt and nothing else until that day, with late answers accepted; the team asked for a
real deadline, on the reasoning that a client who finds the door shut writes to them, and one who
finds it open answers whenever they feel like it.

**It stops the link, not the survey.** `closed_at` stays null and nothing is signed on the team's
behalf, so rule 2 holds and moving the date undoes it completely. Gate 1 is still a person's.

## No volume estimates
Rule 4 stands even though the content survey that prompted it is gone: the platform never
calculates or displays a predicted quantity of work, client-facing or internal. The earlier figure
(~46 content rows per page) came from **one project**, Solramari, and one data point is not a basis
for a number put in front of a client.

## What runs with nobody touching it
Question-block selection from the package · answer collection · promotion to "Needs you" when the
date passes or after 5 quiet days · the insights themselves.

## The whole team app is one page
- **Needs you** — work blocked on the team. Usually two or three rows, sometimes empty.
- **All projects** — a table of every live project: answers, who answered, latest. Click a row to open it.
- **Past projects** at the foot. *Question templates* and *What's coming* went on 17 August 2026 —
  the questionnaire is fixed, and a roadmap panel in a five-person tool is a place to write
  intentions nobody reads.

## Project detail
1. **Right now** — one sentence on what is happening, plus the action if the team is needed
2. **Who answered** — names, positions and contact emails
3. **Documents** — the insights
4. **Archive project** — manual, always available

There is no stage timeline. The five-stage meter went with the kick-off: a project is collecting
answers, or it has a summary, and a row of dated stages was five words for two states.
