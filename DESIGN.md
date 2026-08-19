# Design System — Designally Platform

**The brand is the Designally CI. The chassis is the Apple analysis.** 14 August 2026.

The branding team issued a design system built from the 2026 CI spin-off. Its colour, its
three typefaces, its five named brand pieces and its voice now govern this product, and
this document records them. What did **not** change is the structure underneath: the
parchment inversion, one accent meaning "a person is needed here", borders instead of
shadows, the Thai leading rule, and the two volumes — marketing for the client survey,
store-and-configurator for the team app. The CI describes itself as *a container, not a
look*, and its mood is "expansive, intelligent, timeless"; there was no conflict to
resolve between that and the minimalism already here.

**Shape stayed ours, deliberately.** The CI is Swiss-sharp and sets card and control
radius to 2px, reserving full rounding for the graphic system's points and for Badge.
This product keeps the pill primary and the disc back control, because the survey is
answered one card at a time on a phone where the pill is what the thumb aims at. Studio
decision. Colour, type and the brand marks carry the CI here; shape does not.

**Every colour derived from the CI is measured, not copied.** This product holds 4.5:1 on
anything carrying text and 3:1 on any control boundary, and several of the system's own
derived tokens do not clear that — its accent text tone, all three status tones, and its
focus ring on its own dark Field. Where a value here differs, the hue and chroma are the
CI's and only the lightness moved. Each is marked **CI-DIVERGENCE** in `globals.css` with
the measurement that forced it. These are listed in §1 and are worth sending back to the
branding team; they are defects in the system, not disagreements with it.

Derived from the Apple design analysis. This document is the build reference; where it departs from the source analysis, the departure is stated and justified.

Two things had to be resolved before the Apple system could be used here:

**SF Pro has no Thai glyphs.** Half of this product's text is Thai. The source analysis names Inter as the off-system substitute; Inter has no Thai either. Section 2 resolves this with a paired face and a leading rule.

**Apple's homepage grammar is a marketing grammar** — 80px section padding, one tile per viewport, photography as the subject. A worklist built that way would show one item per screen. The source document itself provides the answer: *"Store and shop surfaces retain the same chassis but switch modes"* and *"this is one design language expressed at different volumes."* So the team app is modelled on Apple's **store and configurator surfaces**; the client survey, which is a first impression and deserves air, is modelled on the **marketing surfaces**. Both are Apple, at different volumes.

---

## 1 · Colour

The CI's five named colours, and nothing invented beside them. One accent, no gradients,
no decorative colour.

```css
/* the five, exactly as the CI issues them */
--orange-500       #ef6148   /* Designally Orange — energy, originality */
--charcoal-900     #1b1d23   /* trust and structure; all display type */
--steel-500        #112d4a   /* the strategic note: links, focus, info */
--warm-white       #f3f3f3   /* the default page */
--stone-500        #aaaaaa   /* the resting state of a point or rule */

/* action */
--primary          #c73f29   /* the action orange: fill, line, dot and text */
--on-primary       #ffffff   /* 5.03:1 */
--primary-mark     var(--primary)        /* parts company only on the dark Field */
--primary-deep     #b03f2b   /* hover darkens, never lightens — 5.85:1 */
--primary-focus    var(--steel-500)      /* focus is steel, never orange */
--primary-on-dark  #ff8f7a

/* ink — the CI's neutral ramp, hued 265° toward the steel Field */
--ink              var(--charcoal-900)
--ink-muted-80     #262a30
--ink-muted-48     #53575e   /* was #6e6e73; the CI ramp is darker here */
--ink-muted-36     #797d85   /* `--ink-4`, 18 Aug: placeholders only. 4.61:1 —
                                over the floor, and plainly not an answer */
--on-dark          #ffffff
--body-muted       #b9bcc2

/* surface */
--canvas           #ffffff   /* raised: cards, sheets, inputs */
--canvas-parchment var(--warm-white)     /* the page */
--surface-pearl    #fafaf9
--surface-fill     #dfd7d4  /* icon-button fill — a warm neutral, see below */
--surface-fill-deep #d3cac6 /* its hover */
--surface-fill-press #c6bbb6 /* its press */
--glyph            #514c49   /* an icon sitting on that fill */
--surface-tile-1   #0b0d12   /* the dark Field */
--surface-black    #000000   /* true void — rare */

/* line — "The Edge" */
--hairline         #cecfd3   /* card and input borders */
--divider-soft     #e6e8eb   /* internal dividers, ghost button ring */
--cut              var(--orange-500)  /* The Cut. Never a rule, never a divider. */
```

**#ef6148 cannot do functional work on the CI's own default page.** This is the deepest of
the divergences and it is worth stating plainly. On warm white the CI orange is **2.92:1**,
so it cannot draw a control boundary, a status dot or a line of text — all of which need
3:1 at minimum. Under white it is **3.24:1**, so it cannot carry a button label either.
It is legal in exactly two places: with charcoal on top of it, and on the dark Field,
where it measures 5.99:1.

Charcoal-on-orange was built first and measured 5.19:1. It was rejected on looks — dark on
mid-orange reads as a caution sign rather than a brand action. Studio judgement, and the
right call.

So **the action colour is the CI hue and chroma at the lightness where a white label
clears 4.5:1**: `#c73f29`, 5.03 under white and 4.54 as a line on the page. One orange,
legal as a fill, a rule, a dot and text — which is why `--primary` and `--primary-mark`
hold the same value on the light Field. They part company only on the dark one, where a
fill still wants depth under a white label but a rule has to lighten to be seen.

The pure CI orange keeps two jobs: **the Cut**, and **the dark Field** — where it is
finally free to be itself.

**The icon disc is a warm neutral, not the CI's cool one.** The CI hues its whole neutral
ramp 265° "so light surfaces echo the steel grey-blue Field". That reasoning does not
survive contact with where this control actually sits: the page behind it is `#f3f3f3`, a
dead neutral with no hue at all, and its neighbour is the orange primary. A blue-grey disc
beside a warm orange button reads as borrowed from another system. Same ramp, rotated to
the orange's own family (45°) at a chroma low enough to stay a neutral rather than become
a tint — and the dark Field's disc is warmed to match, so the control does not change
temperature when the survey crosses from welcome to question one.

Both glyphs are solved against `--fill-press`, the extreme they sit on rather than the
resting state — the lightest fill on the dark Field, the darkest on the light one (4.55
and 4.53). Solving against the resting fill would have left the press state at 3.90.

The disc was also **too pale to read as a control**: at its first lightness it measured
1.28:1 against the page, so beside a saturated orange pill it looked like a smudge rather
than an object. It is 1.81 now. "Dull" was a measurement, not a mood.

### The accent ladder

One hue, four rungs, separated by how much orange each one spends. Anything that marks a
choice sits on this ladder, and nothing may occupy a rung above its importance.

| Rung | Treatment | Means |
|---|---|---|
| rest | white field, 1px `--hairline` | nothing yet |
| **hover** | white field, 1px orange line | you are pointing at this |
| **selected** | pale orange field, 2px orange line | you chose this |
| **the action** | solid orange, white label | this is the one action |

A solid orange fill on a selected chip was built and rejected: it reads as a button, so
eight answered chips looked like eight Continues. The CI's own ChoiceCard names the rung
that belongs there — *"an orange border on a pale orange field."* The label stays ink at
15.18:1 on the tint rather than turning orange; the border and the field already say
chosen, and orange text would be a third signal for one state.

**Radio versus checkbox.** The CI marks a selected radio point in orange and a checkbox
that is on in charcoal, on the reasoning that it budgets roughly one to three orange
marks per screen. The text checkbox list follows that. **The image boards do not** —
studio decision, 14 August 2026. The moodboard is the one card where the client is
choosing the brand's *feeling*, and the answer should read as the brand's colour rather
than as structure. It knowingly spends five orange marks on that card. Confined there.

### The question masthead

The section, the count, the question and the language button were four stacked blocks, so
most of the top of every card was preamble — twenty-one times over, and two of the four
were metadata rather than the question.

They are now one object. The count is set as a **figure** at `clamp(46px, 12vw, 58px)` in
Light 300, with the section beside it at label size stacked EN over TH, and under that the
**screen's subject**, bilingual, at 14.5px. The difference between them is scale rather
than more rows, and a hairline Edge closes the masthead where two blank lines used to.

The subject arrived on 17 August 2026 from the slide, where it had been a heading with a
plain-English second line under it that on nine screens out of eleven restated it — *"Your
customers, and what they worry about"* over *"Who buys from you, and what makes them
hesitate"*, before the two questions that say it a third time. The restatement is deleted
from `steps.ts` and the heading moved up here, so the masthead is now the whole of what a
person is told before the work: where you are, which part you are in, what this screen
covers, and the Cut. The slide holds questions and nothing else.

**The section stays stacked, not joined with a middot.** Tried, and reverted: on a rail
this narrow the joined string wrapped anyway, and it wrapped in the middle of the Thai.

Pinned, the masthead is 166px on a 390px phone — a fifth of the screen, permanently. It
buys back more than that: with the heading gone from the slide, a two-question group and
both its folded rows now fit one 844px screen with about nine pixels of scroll.

Three decisions inside that are worth keeping:

- **The numeral is Light, not Bold.** At 58px a bold figure outweighs the question it
  introduces. The size is there to stop the count being a line of text, not to make it loud.
- **The line under the masthead is both — and the Cut is the progress.** See below.
- **The language button belongs to the question, not to the masthead.** It acts on the
  question, so it sits under it. It cannot be nested *inside* the question either — the
  question is a `<label>`, and a button inside one inherits the label's click target and
  would toggle the control it names every time somebody asked to read it again.

`font-variant-numeric: tabular-nums` so the figures do not jitter as the count passes 9
and 19.

### A group shows one question at a time

A screen holds two to four questions. It shows them all and opens one.

It used to open all of them, and that was three copies of the old
single-question screen stacked — each with a headline-weight ask, its own
language control, its own *Shift + Enter* hint and its own full-width rule. One
screen read as three, and the group heading had been pushed to display weight
at 28px/700 to hold them together, which put the loudest type on the screen on
a label naming what the questions already name.

**The open question is the screen.** It takes the full 33px of `.slide .qq` —
the size a lone question always had, and the size it had been stepped down from
for a problem this solves better.

**A folded row is the number, the question clamped to two lines, and — once
answered — what the client wrote, clamped to one.** Two lines rather than one,
because a row nobody can read is a row they have to open to find out whether
they want to open it, and seeing what a section covers before answering it is
the reason the branding team asked for grouped screens in the first place.

**There is no tick.** The answer is the status: a row showing the client's own
words has been answered, a row showing only a question has not.
`docs/navigation-decisions.md` carries a status in words rather than a mark that
needs a legend, and here the words are the client's. Which also means every
piece of ink on the screen is either a question or an answer.

The heading is not on the slide at all — it is in the masthead, above.

**Every question on the screen shares one left edge.** The folded rows hang their number
in a 34px column; the open question hangs its own the same way, as a hanging indent rather
than a grid — it is a run of inline content, and a grid would make the number, the text and
the revealed Thai three columns. It was inline with a 9px margin before, so the open
question's text started at whatever its numeral happened to measure: 226px against the
folded rows' 222px, on the one edge a list is read down.

**No hairline on top of the list.** There was one, 65px under the masthead's own Edge —
two full-width lines with nothing between them, which reads as a seam. The Edge closes the
masthead and opens the list.

Rows are separated by a hairline, not by the 34px void they used to have. The
void said "these are separate asks", which a line says better and in no
vertical space — and that space was most of what made one screen read as three.
A Brand group now fits a 390px screen with about 40px of scroll.

**Enter goes to the next question on the screen, and only leaves the screen
when none is left.** Continue always leaves. They are no longer the same act,
so the hint beside Continue says which is which — without it, Enter on the
first of three questions stranded the other two behind a screen the client had
already left, which is the hazard of showing one at a time.

**One question on a screen is left alone.** The personality scales are a step of
their own — ten pairs is a screenful and nothing shares that breath — and
collapsing the only thing on a screen would leave nothing to look at.

### The five named pieces, and where they are

| Piece | Where |
|---|---|
| **The Field** | warm white, every screen |
| **The Edge** | every card, input and divider — 1px, never orange |
| **The Wordmark** | welcome and completion only |
| **The Cut** | **once on every screen** — vertical, down the right edge, and it is the progress |
| **The Point** | the head of the Cut · the questionnaire grid · the team app's "needs you" |
| **The Mark** | not yet — no vector was supplied, only a 274px PNG |

### The Cut stands up — and lies down again on a phone

**Wide: a full-height line down the left edge, fixed, with a filled disc
crossing it beside the masthead and the count inside the disc.** The rail's x
is derived from the column — `50vw − col/2 − 58px` — so the disc lands 17px
clear of the first word instead of out at the viewport's edge, and the disc is
hung off the masthead rather than the rail, so it is level with the words by
construction rather than by a hardcoded offset.

**The answer field is a card, not a form row.** `--r-lg`, the radius every
other card on the page takes; 17/19 padding; the line darkens on hover like
every other quiet control; the focus ring is the system's one shadow, three
pixels of the accent's own tint with no offset and no blur, so it reads as a
second line rather than as light. The caret is the accent — the one place it is
unarguable, since it marks exactly where the person is. Nothing on
it moves — the line runs its full length on every screen and never fills, and
the number inside the disc changes rather than a mark sliding down a track. The
line is the brand's mark, not a progress track.

**On a phone the Cut lies down and becomes the masthead's own bottom edge**,
with the disc crossing it at the trailing end. Vertical, the rail cost a 100px
gutter out of a 390px screen and left the questions a 264px column — on the one
surface whose whole problem is having room for a Thai question. The section and
the subject both sit *above* it: it closes the masthead rather than dividing it,
and drawing it as a border means nothing has to measure a masthead of unknown
height to find out where the line goes.

That masthead is **sticky on a phone** — the section, the subject, the line and
the disc hold the top while the questions pass under them. It is the one fixture
at that width; the wide layout gets its fixture from the rail instead.

**The disc is `--primary`, not the CI's `#ef6148`.** It carries white numerals,
which is the job §1 measured that colour at 3.24:1 and failed. The line beside
it keeps the pure CI orange, because nothing is read from a line.

**The section and the subject are English only**, from 17 August 2026. They are
wayfinding; every question under them is fully bilingual and one tap from Thai,
so nothing a client has to *answer* is English-only. What the Thai bought was a
four-line masthead on a phone where two will do. Worth saying to the branding
team rather than letting it pass: a Thai-only reader meets those two lines in
English.

**The answer is a box, not a ruled line.** It was a bottom border on a
transparent ground — a writing line rather than a field. That reads beautifully
on a screen holding one question and stops reading on a screen holding three:
an underline says *words go above me* and gives no edge left or right, so with
several stacked there was nothing to say where one answer's ground ended and
the next question began. Canvas inside the Edge at `--r-md`, which is the same
object every input in the team app already is.

**The count is screens, not questions.** It counted questions for a few hours,
and that was right only while a screen opened one question at a time — you
really were on question 8 of 21. All two to four are open again, so "15 of 21"
over a screen holding 15, 16 and 17 was the position of the screen's *first*
question wearing the look of a position in the questionnaire. A screen is what
a client moves through and each one has a heading naming what it covers, so the
disc counts those: `1/9` on Brand, `1/5` on Design.

**Every heading is one line.** They were sentences — *"Your customers, and what
they worry about"* — that wrapped to two and three lines beside the disc. Each
step already carried a short phrase for the same job in an `eyebrowEn` written
when the masthead had an eyebrow, and never once rendered. The phrases are the
headings now; the longest is *"References and limits"*. `white-space: nowrap`
is the guard, so a longer one shows up as a string that needs shortening rather
than wrapping into the question.

**There is no question number on the card.** It went on 17 August 2026. It was
there because the masthead counted screens and each question had to say which
of the twenty-one it was; its one remaining reader is the send screen's grid,
which points a client back at a specific blank and now lands them on a screen
of two to four questions with nothing visible saying which one they came for.
That path is weaker for it, deliberately — the number was the last piece of
furniture between the heading and the question, and every question now opens
with its own words. `question.number` is untouched in the data: the grid knows
it, the team's reading of the answers prints it, and the analysis cites it.

*Its treatment while it existed, kept because the reasoning is reusable:*
**a figure, set the way the count is.** Light 300 in the
display face at 20–28px, grey. It was 13px semibold — a caption-sized bold "3"
over a 33px question, which reads as a stray piece of metadata rather than as a
number. The masthead settled this once and the reasoning carries: *"at 58px a
bold figure outweighs the question it introduces. The size is there to stop the
count being a line of text, not to make it loud."* A question's number is the
same object one scale down. Weight and colour keep it under the question, not
size.

**It sits above the question**, not beside it. Everything a
question owns then shares one left edge — its words, the ไทย control, the
field, its hint, its choices — and that edge is the centred column's own.
Hanging the number in a 34px margin needed an indent that either narrowed a
`width: 100%` field or ran it off the right of a phone, and it pushed the words
17px right of the middle because the page was centring the question *plus* its
indent.

**And no rule between questions.** The hairline was right while a question was
one line and its answer one more. With the answer a box of its own, the box
*is* the boundary and a rule under it was a second one a few pixels away. 44px
of space does it instead.

**The floor controls are in the flow**, under the questions, at every width.
They were fixed to the viewport floor on a phone, riding above the keyboard on
a measured `--kb` with a four-layer blur ramp beneath them. All of it went the
same day: on a screen a client scrolls to the end of, the way forward belongs at
the end, and a bar pinned over the last question was covering the thing it was
asking about. The blur was §3's one documented divergence, and the system gets
it back.

Three things went with the horizontal bar, and each was load-bearing:

- **The masthead stopped pinning.** It was fixed to the top so the Cut could
  stay in sight. The rail is fixed instead, so what had to stay in sight does.
  What is left in the masthead — the section and the subject — is read once on
  arrival and scrolls away with the screen it describes. On a phone that is
  **166px of permanent header returned to the questions**, against a 56px
  gutter the rail costs.
- **The left rail went.** Above 1080px the masthead was a 220px margin column
  beside a 640px column of questions. It existed to hold the count and the Cut
  at eye level, and both are on the right now. The column holds the left margin
  at 780px instead, so the section, the subject, the question and its answer all
  start on one line.
- **`--mast-h` went**, and a `ResizeObserver` with it. It existed so the scales
  card's sticky header could sit under the pinned masthead — two things claiming
  `top: 0`. There is one thing at the top edge again.

**It counts questions now, not screens.** The masthead counted screens because
a screen held two to four questions at once, and the reason was right at the
time: *"8/21 while looking at three questions at once is a riddle."* A screen
shows one question at a time as of the same day, so the client really is on
question 8, and the questionnaire counts the thing the welcome screen promises.
The point moves *within* a screen as each question opens — progress is
continuous rather than nine jumps.

**Two orange marks on a question screen, for the first time under the ceiling**:
the point, and Continue.

### The Point — the CI's graphic system, adopted 17 August 2026

`guidelines/brand-point-line.html` names six things the point does: **point, scale, line,
connection, focus, structure**. `PointRule.jsx` calls the line-ending-in-a-point "the
brand's connector", and adds a warning worth repeating: *"Not a substitute for The Cut."*

Three of the six are in this product. Two of those were already here before the CI arrived.

| Idiom | Here |
|---|---|
| **Line** — a rule terminated by a point | the Cut's head, every screen |
| **Structure** — a grid of points | the questionnaire, on the welcome, send and completion screens |
| **Point** — a single mark | the team app's *needs you* dot, which predates the CI |
| **Scale** — points growing in size | already solved, differently and better — see below |
| **Connection** — point·line·point | explored for the question group, not taken: the points would replace the question numerals, and the send screen navigates by number |
| **Focus** — a point inside a ring | explored for the scale and radio controls, not taken yet |

**Functional points are `--primary-mark`, never the CI's `#ef6148`.** §1 measured the CI's
own point colour at 2.92:1 on warm white. The Cut carries it because nothing is read *from*
the Cut — it has weight, not information. A point that says where you are, or whether a
question is answered, is read from, and takes the measured orange at 4.54:1. The two are a
hair apart in hue; the difference in what they are allowed to mean is not.

**The Scale idiom was already solved here, and better.** The CI ramps points `5 → 9 → 15 →
22px` in one direction. The personality scales run `32 · 28 · 24 · 28 · 32` — large at both
poles, small at the neutral centre — so size encodes *distance from neutral*. The CI's ramp
would have told every respondent that Modern is **more** than Traditional. Worth sending
back: the graphic is right, its direction is wrong on a bipolar scale.

**The team app's dot is the Point idiom, built before the idiom arrived.** 8px,
`--primary-mark`, one meaning. §6's "Action Blue" naming below is older than the CI
adoption and describes a colour this product no longer uses.

**One Field, twenty-three screens.** The welcome and completion ran on the CI's near-black
Field, which it reserves for a moment of drama. They read better as one surface: the drama
cost a change of ground twice in a sitting, and a client who has just answered twenty-one
questions does not need the page to announce that they finished. The `[data-field="dark"]`
token set stayed in `globals.css` afterwards, applied nowhere — it is one of the CI's three
named Fields, and it carries corrections (the focus ring the system leaves at 1.39:1 on that
ground) that would be re-derived wrongly from the CI alone.

**It was in service for an afternoon on 19 August 2026 and came straight back out.** The
Collection bar was built on it and taken off the same day, and the reasoning is about the
Field rather than that bar: near-black inside a warm-white sheet is the loudest thing on
the page, and a section is not the page's action. On that sheet the action is *Generate
insights* two sections below it, wearing the accent, and a bar shouting over it is a bar
arguing for itself. **The dark Field is for a surface that has earned being the only thing
somebody is looking at.**

Two things are worth keeping from the afternoon. Nothing in the token block had to change
for the bar to stand on it — one attribute on one wrapper re-coloured the bar, the date
field inside it and the calendar it opened — which is the proof the mechanism works and the
argument for keeping it. And it surfaced a divergence the block does not carry:
`--primary-tint` is the pale orange the light Field fills a focused date segment with, and
on that ground it is `#34211d` at **1.11:1**, so the field's border says the control has
focus and nothing says which of its three cells the arrow keys move. `#8e5d4c` is the same
hue and chroma at the lightness that measures 3.06:1, with the digit at 4.95:1 on top. It
is recorded at the token rather than applied, because nothing stands there now.

### The Cut is the bookends

The welcome and completion carry the same masthead the questions do, at the two ends of
its run:

| Screen | Figure | Cut |
|---|---|---|
| Welcome | `21` — questions · about 20 minutes | full |
| Name, position, email | *none* | *no Cut, no masthead* |
| Screen *n* | `n/9` | grown to *n* of the way across |
| Completion | `21/21` — answered | full |

The welcome's Cut runs full rather than starting short. Nothing has progressed there yet,
so a part-drawn line does not read as *none of twenty-one done* — it reads as a rule that
failed to finish, which is why the old progress bar was hidden on that screen rather than
shown at zero. Full, it is simply the Cut; it starts measuring on question one.

**The identity screen has no masthead at all.** Asked for 17 August 2026. Name, position
and email are what a person gives *before* the questionnaire: counting them put `1/6` over
a screen holding no question and started a Design survey a sixth of the way along before
anything had been read.

The Cut was kept there at first, at its 88px resting length, on the argument that the
brand's mark was worth having even where it measured nothing. It went too, the same day
and rightly — **on this surface the Cut *is* the progress**, so a Cut on a screen outside
the count offers a reading where there is nothing to read. The Edge goes with it: the
hairline is the Cut's own track, not a divider in its own right, and a track under no Cut
is furniture.

What is left is a collapsed band — the element still exists, because the slide's layout is
selected on `:has(> .qmast)`, but it carries only the safe-area inset. The count is keyed
on the card being a **field grid** rather than on it being the first one, because that is
the actual property.

That replaced prose on both ends. The welcome had the count and the time set as a sentence
in the smallest type on the screen, under the button — the one fact a person weighs before
committing twenty minutes. The completion opened with a 52px tick, then said the answers
had arrived, then said it again in Thai, then explained the button underneath: four ways
of saying done. The line that measured the questionnaire arriving at its full width says
it once, and the tick and the sentences went with it.

The Cut earns the pure CI `#ef6148` rather than the measured action orange: nothing sits
on it, nothing is read from it, and it is not a control, so it carries no contrast
obligation — only weight. It is the only orange line permitted anywhere. Rules, dividers
and table borders are never orange, because an orange line means something here.

### The Cut is the progress

**The survey has no progress bar. The Cut is the progress.**

The objection to an orange line under the question masthead was to an orange *divider* —
which the CI does forbid, and for this reason. It does not reach the Cut, because the Cut
is not a rule: it is a segment, left-aligned, closing nothing. So the masthead carries
both, doing the two jobs they are each for. The Edge runs the full width and gives the
block its floor; the Cut sits on its left end and says the card begins.

And then it grows — by `transform: scaleX()`, not by width. The CI's motion tokens define
`--transition-cut: width var(--dur-slow) var(--ease-out)`, and this is the one place that
token is not followed literally: `width` is a layout property, so each frame of a 380ms
transition re-laid the masthead out, on every advance, on a phone on a poor connection. A
scale from the left edge draws exactly the same line and never leaves the compositor. The
CI is right that the line was always meant to move; it is wrong about which property moves
it. So the Cut measures how far in the
client is, and the sticky bar that used to float at the top of the viewport is gone: one
mark instead of two, at the place the card begins rather than above it, and the brand's
own object rather than borrowed chrome.

**It is the fraction, and nothing added to it:**

```css
width: calc(var(--cut-progress) * 100%);
```

It was not. `--cut-length` used to be where the Cut **started**, with the progress mapped
onto what was left:

```css
/* until 17 August 2026 */
width: calc(var(--cut-length) + var(--cut-progress) * (100% - var(--cut-length)));
```

That was right for what it was written against. The survey then ran **one question per
screen, twenty-one of them**, and a truthful 0–100% put question one at a 16px stub that
reads as a rendering fault rather than a beginning — while clamping with `max(88px, …)`
was worse, freezing the Cut for the first five questions so a quarter of the survey gave
no feedback at all.

**The premise expired when the screens were grouped.** Five to nine screens means the
first one is a fifth or a ninth of the track — 73px at the narrowest, within a few pixels
of the 88px the CI gives the Cut at rest. Nothing has to be added to make it read as a
line, and adding it made the two halves of the masthead contradict each other: `1/5`
beside a bar at 38% is the bar calling the numeral a liar. `--cut-length` is now unread —
kept as the CI's number for a static Cut, which the next one will want.

Question cards carry **three** orange marks — the Cut, the point at its head, and the
Continue button — against the CI's stated one to three. That is the ceiling, and reaching
it cost the `ไทย` control its accent on 17 August 2026.

**The `ไทย` pill keeps its shape and gives up its colour.** It was a word with a hairline
under it once, and was promoted to an orange pill because a Thai reader missed it — which
for them is the difference between a bilingual survey and an English one. That finding
stands, so the pill stands: still 48px of target, still impossible to mistake for prose.
What it gave up is the accent, because the accent means *a person is needed here* and the
marks that carry information have first claim on it.

**The masthead pins, and it is the only thing on the slide that does not move.** It sits
above `.slide` rather than inside it, for two reasons that have to hold together:

- `position: sticky`, so the Cut stays on screen through a long card. The ten personality
  scales are taller than any phone, and mid-scroll is exactly when someone wants to know
  how much is left.
- Outside the keyed `<section>`, so it *persists*. The section carries `key={step}` and is
  torn down on every advance; a freshly mounted element has no previous width to
  transition from, so inside it the Cut would jump to its new length rather than run to
  it. Outside, only `--cut-progress` changes and the CI's `--transition-cut` works.

It is also outside `.slidemain`, so the entrance animation applies to the question alone —
metadata that re-animated on every card while pinned would be the worst of both.

**Two sticky things need a stacking order.** The scales card pins its own question so the
eighth pair is still answering something, and it claimed `top: 0` too. The masthead
publishes its measured height as `--mast-h` and the question header pins at that offset.
Measured, not written down: the numeral is a `clamp()`, so the masthead is 115px on a small
phone and 127px on a large one.

**The card is centred when it fits and top-aligned when it does not**, and neither of the
obvious rules does that. `align-items: center` centres a short question but pushes a long
one off both ends with its top unreachable — that is how the scales card used to lose its
first pair. `flex-start` keeps every card reachable and strands a short one under the
masthead with the screen empty below it.

Cross-axis **auto margins** do both, with no media query and no measurement:

```css
.slidebody { margin-block: auto; }
```

Free space is handed to the margins, so a short card centres in the area the masthead
leaves; when the space runs negative they resolve to zero and the card starts at the top,
fully scrollable.

### Above 1080px the masthead is a rail, not a header

Three layouts, and the third is the one the CI's type was drawn for.

Below 1080 the masthead is a band pinned across the top. That is right on a phone and on a
small laptop. On a wide screen it was wrong twice over: a 640px column left a third of the
display empty on either side, and three short lines of metadata spanned 1400px of a band
they did not need.

Set as a **margin note** the proportions come back — a 220px rail, a 56px gutter, and the
question in a 640px column. The composition spans **916px instead of 640**, the numeral
grows to 64px, and the question takes `clamp(2.05rem, 2.6vw, 2.55rem)`. A figure in the
margin with the text beside it is the editorial reading the CI describes.

Two things the rail changes that are easy to miss:

- **The rail must be `align-self: start`.** A grid item that fills its own area has no room
  left to stick inside it, and the rail would scroll away with the question.
- **`.scalehead` stops offsetting by `--mast-h`.** That variable is the height of a header
  that sat *above* the content; beside it, the offset is a hole — and in the rail the
  masthead measures 238px, so the scales card's pinned question would have started a
  quarter of the way down the screen. It aligns to `--rail-top` instead.

**No `ch` cap on the question.** The mock set `max-width: 20ch`, which wrapped a real
question to six lines while using half the column it had. The column is the measure.

**Everything on the rail layout opens on one line: `--eye`.**

```css
--eye: clamp(96px, 18vh, 170px);
```

A little under a fifth of the way down — where the eye lands, rather than where the
viewport begins. Three things hang off it: the rail's numeral, the question beside it, and
the scales card's own pinned header when it comes up to meet them. A short card starting
at the top edge left most of the screen empty beneath it; opening here turns that
emptiness into margin.

There was briefly a second token letting tall cards open higher, on the reasoning that an
offset costs them screen. It bought them 82px and cost the thing the rail is for: the
numeral would have sat level with the question on eighteen cards and above it on three, so
the one fixed point on screen appeared to move as a client advanced. One line, every
question — and a long card still reaches its end, because it scrolls and its own header
pins at the same line.

**The page reserves its scrollbar for the same reason:** `scrollbar-gutter: stable` on
`html`. Twenty cards fit their screen and the ten personality scales do not, so arriving
there took the scrollbar from nothing to 15px, narrowed the viewport, and a centred layout
gives up half of that on each side — the rail stepped from 262 to 255 and back on the way
out. Seven pixels, on the one element a client reads their position against. Overlay
scrollbars — every phone, and macOS unless the setting says otherwise — reserve nothing,
so nothing changes there.

**A pinned header in a column must paint the band above itself.** `position: sticky` with
a `top` offset leaves that offset's worth of space above the element for content to scroll
through. The masthead solves this by carrying the offset as *padding*, inside the pinned
box. The scales card's own header cannot — it is not the top of its column, and padding
would push it down again when unpinned — so it paints a band with a pseudo-element
instead. Size that band generously rather than to the offset token: measured, the box
settles 8.4px below its own `top`, and a band of exactly `--eye` left a sliver for the rows
to show through.

### The masthead holds the top at both widths, and stands off the edge on a laptop

It is pinned everywhere — the Cut measures progress and has to stay in sight. What differs
is how far it stands off the screen edge: **34px on a phone, 64px above 620px**, so on a
laptop the count never reads as jammed into the corner.

**The offset is the masthead's own padding, not a `top` value, and that is the whole
trick.** Pinning with `top: 64px` leaves a 64px band above it that the card scrolls up
through, so content appears above the header. An offset made of padding sits *inside* the
pinned box, so that band is the masthead's own background and whatever scrolls under it
stays under it. It also keeps `--mast-h` honest — it is measured with `offsetHeight`, so
the scales card's own pinned question keeps stacking underneath without knowing anything
changed.

Getting here took three wrong turns, all of them treating a symptom:

| Attempt | What broke |
|---|---|
| Centre the card under the pinned masthead | metadata stranded 173px above the question |
| Top-align the card | screen empty underneath |
| Fix the controls to the floor to anchor that | button 200px from the answer it submits |
| Centre masthead and card together as a group | the header stopped being fixed |

With the header genuinely fixed, the card is measured *off it* rather than centred away
from it: a controlled `clamp(20px, 5vh, 48px)` gap below it, and the rest of the space
falls to the floor where nothing has to line up with anything. On a phone the card still
centres in what the masthead leaves, because there the free space is small enough that
centring keeps the count close to its question.

Before this, the client's first impression of Designally carried no Designally anywhere
on it — the survey had no wordmark on any of its twenty-three screens.

### CI-DIVERGENCE — five measurements to send back

Hue and chroma are the CI's in every case; only lightness moved.

| CI token | CI value | Measured | Used here |
|---|---|---|---|
| `--surface-accent` as a button | `#ef6148` | 3.24:1 under white | `#c73f29` — 5.03 |
| `--text-accent` | `#d95039` | 3.67:1 on page | `#c73f29` — 4.54 |
| `--status-done` | `#329568` | 3.36:1 | `#107f54` — 4.52 |
| `--status-warn` | `#e39f2c` | **2.04:1** | `#a06000` — 4.54 |
| `--status-danger` | `#d72d34` | 4.39:1 | `#d32830` — 4.60 |
| `--edge-focus` on `[data-field="dark"]` | `#112d4a` | **1.39:1** | `#a9c4e8` — 10.87 |
| `--primary-tint` as a focused date cell on `[data-field="dark"]` | `#34211d` | **1.11:1** | `#8e5d4c` — 3.06 (recorded, not applied) |

The last one is the one that matters most: the CI's dark Field remaps its links and its
edges but not its focus ring, so the ring is invisible on the one Field the system's own
survey kit uses for its welcome screen — where a keyboard user arrives first.

**Zalando Sans has no Thai.** The system's readme says it covers Latin and Thai; Google
publishes it in latin, latin-ext and vietnamese only. See §2.

**The parchment inversion.** The page is `--canvas-parchment` (#f5f5f7) and raised surfaces are pure white. This is the single most important structural borrowing: *surface change is the hierarchy*. Cards lift off the page because they are lighter, not because they have a shadow.

**Action Blue is the only accent, and it means "a person is needed here."** Every interactive element uses it; nothing decorative does. This survives unchanged from the previous system and matches Apple's own rule exactly.

**The accent also marks what has been chosen — and hover never does.** Settled 13 August 2026, after one pass in the other direction.

Apple tints the chosen thing: a checkmark, a selected segment, a picked row. Following that costs nothing here as long as the third state is kept out of the way, and the third state was the real fault. Selection and hover were both blue, so a chip you were merely pointing at read as more chosen than the one you had picked — and on a phone, where hover has no way to end, tapping to deselect left the blue behind.

| | |
|---|---|
| **Accent** | this needs you, or you chose this: buttons, links, controls, the focus ring, the waiting-project dot, a selected chip's 2px border, a selected card's border, the fill behind a tick |
| **Ink** | you are pointing at this: every hover on a choice, and only on devices that can hover |
| **Never** | decoration of any kind |

Hover rules are wrapped in `(hover: hover)`. A device that cannot hover must never be given a state it cannot clear.

The accent's ten-percent ceiling still holds, and selection is what makes it easy to breach: a screen where everything is chosen is a screen that is entirely blue. If that starts happening, the ceiling wins and selection moves to ink.

**Correction, milestone 1.** `--ink-muted-48` was `#7a7a7a`, described below as meeting 4.5:1. Measured, it does not: **3.94:1 on parchment and 4.29:1 on white**. Since the meta colour carries the Thai sub-line under every question, that failed the WCAG 2.2 AA baseline in `PRODUCT.md` for exactly the readers who most need it. It is now `#6e6e73` — Apple's own secondary label colour — which measures **4.66:1 on parchment and 5.07:1 on white**. Do not lighten it, and note that any grey checked only against white will fail on the parchment page.

### Semantic tones — the one addition

**Corrected 14 August 2026 — the green could not carry text.** `--affirm` was
`#248a3d`, which measures 4.40:1 on canvas, 4.04 on parchment and 4.02 on its
own tint. This section says these tones are for text and thin tints; that one
was unable to be text anywhere in the system, and only passed review because its
single use was a decorative `aria-hidden` tick at the 3:1 graphical floor.

It is `#1f7835` — the same hue (135°) and saturation, lightness alone moved. Now
5.53 / 5.08 / 5.06. **A tone defined for text has to be checked against the
lightest surface it can land on, which here is its own tint, not white.**

Apple's marketing surfaces have no semantic colour because they never report state. This product reports conflict severity, agreement and waiting, and accessibility requires that state never rely on colour alone — every one of these also carries a text label.

Where the source is silent, use **Apple's own accessible system-colour variants**, the darkened versions published for text on light backgrounds:

```css
--affirm    #248a3d   /* agreement, confirmed, done      — 4.8:1 on parchment */
--caution   #c93400   /* waiting, medium severity        — 6.2:1 */
--critical  #d70015   /* high severity only              — 6.5:1 */

--affirm-tint    #eef7f1
--caution-tint   #fdf1ec
--critical-tint  #fdeff0
```

Use them for text and thin tint backgrounds only. Never as fills, never on buttons — buttons are Action Blue or ink.

---

## 2 · Typography

### The three faces

The CI names three, and Thai decides how they combine:

```css
--font-display: var(--font-zalando),  var(--font-plex-thai), system-ui, sans-serif;
--font:         var(--font-poppins),  var(--font-plex-thai), system-ui, sans-serif;
```

- **Zalando Sans** — display, headings, every button and UI label.
- **Poppins** — Latin body copy. The CI sets it Light 300.
- **IBM Plex Sans Thai** — Thai body *and* Thai display.

**Zalando Sans has no Thai, whatever the system's readme says.** Google publishes it in
latin, latin-ext and vietnamese; `next/font`'s own font data agrees. Thai display
therefore resolves to IBM Plex Sans Thai at **700 — a real weight, not a synthesised
one**, because faux-bolding Thai thickens the tone marks into the glyph above, which is
the exact defect §2's leading rule exists to prevent.

The fallback is per codepoint, so a bilingual string resolves correctly inside one run of
text. Never wrap Thai in its own element to "help" it — `Start · เริ่มทำแบบสอบถาม` sits on
one line and splitting it breaks the baseline.

**All three are self-hosted through `next/font`.** The design system loads them from
Google Fonts through an `@import` inside a stylesheet, which is the worst available shape
here: a CSS `@import` is serialised, so the browser fetches the stylesheet, parses it, and
only then discovers the fonts — and the survey is answered on a phone, in Thai, on a poor
connection, by somebody with no reason to wait. `next/font` self-hosts at build time,
splits by `unicode-range` (a Thai reader pulls ~61 KB, an English one ~45 KB), preloads
from our own origin, and generates a metric-matched fallback so the page does not reflow
when the real face swaps in.

**Body tracking is 0.** It was `-0.374px`, which is SF Pro's own optical tracking; Poppins
is a geometric sans with wider sidebearings and does not want it, and negative tracking on
any bilingual line collapses Thai tone marks. Display type takes `-0.03em`, and the client
surface overrides even that to 0 — see the tracking floor later in this section.

**Inter adjustments from the source:** nudge display letter-spacing down a further `-0.01em`, and tighten body line-height from 1.47 to 1.44. Inter's tracking is wider and its x-height taller than SF Pro's.

### Scale

Apple's ladder, mapped to this product. Weights are **300 / 400 / 600 / 700** — 500 is deliberately absent.

| Token | Size | Weight | Leading | Tracking | Use |
|---|---|---|---|---|---|
| `hero` | 56px | 600 | 1.07 | -0.28px | Survey welcome only |
| `display` | 40px | 600 | 1.10 | -0.01em | Page headings — "Two things need you" |
| `section` | 34px | 600 | 1.20 | -0.374px | Survey step headings |
| `lead` | 28px | 400 | 1.14 | 0.196px | Survey sub-copy |
| `tagline` | 21px | 600 | 1.19 | 0.231px | Client name in a worklist row |
| `body-strong` | 17px | 600 | 1.24 | -0.374px | Inline emphasis, labels |
| `body` | 17px | 400 | 1.44 | -0.374px | **Default paragraph** |
| `caption` | 14px | 400 | 1.43 | -0.224px | Meta, secondary |
| `caption-strong` | 14px | 600 | 1.29 | -0.224px | Small labels |
| `fine` | 12px | 400 | 1.30 | -0.12px | Fine print, tags |

**Body is 17px, not 15px.** This is the borrowing that most changes the product's feel — it turns the brief from something scanned into something read, which is exactly what the brief needs.

### One colour per line

**No line of text carries two colours.** Emphasis inside a sentence comes from weight only — `body-strong` is the same ink as `body`.

This applies to page headings (no greyed closing phrase), the wordmark (one colour, weight contrast only), bold inside prose, stage labels, respondent lines and question numbers. Colour still differentiates across *separate* lines and columns — a meta line beneath a title, a right-aligned count — never within one.

A corollary: markers carried by a coloured glyph are not allowed. A status is the word for it, never a star or a dot beside a name. A bare glyph needs a legend; words don't — and a coloured glyph steals Action Blue from its one meaning. The blue dot in the projects table is the single exception, and only because it carries the accent's own meaning: this project needs a person.

### The team app is English

**Decided 18 August 2026.** Every string the team app draws for itself — labels,
buttons, menu rows, notes, toasts, validation — is English and nothing else. It
is used by Designally staff behind a Workspace login, and the bilingual pairs it
carried ("Collection closed · ปิดรับคำตอบแล้ว") were doubling the length of
every confirmation for readers who had already read the first half.

**The data is untouched, and that is the whole distinction.** Client names,
respondent names, positions and every answer are shown exactly as they arrive,
which on this product is Thai more often than not. So the leading rule below
still governs the team app wherever *content* appears — a respondent's name in a
sheet title, an answer in a list, a client's name inside a confirmation — and
stops governing the chrome around it, which can no longer hold a Thai glyph.

**The survey is unchanged and stays fully bilingual.** It is answered by clients
on a phone; that surface is the reason the rule below exists.

### The Thai leading rule — overrides Apple

Thai stacks four levels vertically: base glyph, upper vowel, tone mark, lower vowel. Apple's leading is tuned for Latin and clips it.

> **Any line containing Thai uses a minimum line-height of 1.6. Thai paragraphs use 1.7.**

This overrides the table above wherever the two conflict. In practice: `body` is 1.44 for Latin-only strings and 1.6 for bilingual ones. Because almost every client-facing string is bilingual, **set 1.6 as the default on client surfaces** and use the tighter Latin values only in the team app where a line is English-only.

Never tighten tracking below `-0.02em` on a line containing Thai — negative tracking collapses tone marks into the glyph above.

**In practice, milestone 1.** The table's body tracking of `-0.374px` is `-0.022em` at 17px — just past that floor — and on a client surface *any* line can carry Thai, including a heading holding a respondent's name ("Thank you, คุณสมชาย ใจดี"). Chasing this string by string does not hold up. So the client surface runs **untracked throughout**, and only `step h1` and `step h2` take the floor value of `-0.02em`. The Latin tracking in the table stays in force in the team app, where lines are English-only.

**Display sizes — the clause, added 13 August 2026.** The 1.6 floor is calibrated for body text, where it buys 27px of leading at 17px. What protects the Thai stack is the *absolute* room between baselines, not the ratio. A heading at 37.6px set to 1.6 would take 60px and read as two unrelated lines.

Rendered the worst case — `ที่ปรึกษาญี่ปุ่น ผู้ใหญ่ ปฏิรูป`, which stacks an upper tone mark and a lower vowel on adjacent lines — at 37.6px and three leadings:

| Leading | Absolute | Result |
|---|---|---|
| 1.06 | 39.9px | The lower vowel of `ปุ่น` meets the tone mark on `ใหญ่` below. Collides. |
| **1.28** | **48.1px** | **Clear. Adopted for `step h1`.** |
| 1.6 | 60.2px | Clear, and visibly loose for display type. |

So: **1.6 stays the floor for anything at body size. Above 32px, the floor is 44px of absolute leading**, which 1.28 clears at every size `step h1` reaches. Nothing else in the system is above 32px. `step h1` shipped at 1.14 before this was measured, which was inside the collision range.

**Single lines — the clause, added 13 August 2026 after auditing the team app.**

The floor above is a *paragraph* rule, and applying it to everything makes it useless: measured against the whole stylesheet, **32 sized text rules sit under 1.6 — including `body` itself at 1.44.** A rule that condemns the foundation of the system cannot be used to find a defect in it, and for two days it was not finding the two that were real.

A paragraph needs 1.6 for two reasons: reading a four-level script densely is hard, and one line's lower vowel must clear the next line's tone mark. **A name, a heading, a label or a table cell has no next line.** Its only requirement is that the line box contains the ink.

Rendered `ตั๋วปื้ญฤๅ ที่สุด` — upper vowel, tone mark and lower vowel on one line — the ink measures about **1.20× the font size**. So:

| Element | Set at | Box | Ink | |
|---|---|---|---|---|
| `body` | 17 / 1.44 | 24.5px | 20.5px | 4.0px clear |
| `.person` — a respondent's name | 13.5 / 1.45 | 19.6px | 16.5px | 3.1px clear |
| `.work .name` — a client's name | 21 / **1.19** | 25.0px | 25.5px | **clipped** |
| `.brief h1` — a client's name | 32 / **1.2** | 38.4px | 38.5px | **clipped** |

> **A line that can hold Thai and stands alone uses a minimum line-height of 1.25.** The ink measures 1.20–1.22 of the font size across every size tested, so 1.25 is that plus a little room for a taller stack than the sample. Paragraphs keep 1.6, and 1.7 when the paragraph is Thai.

The margin is deliberately small. A floor of 1.35 was tried first and condemned `slide h1` at 1.28 and `step h1` at 1.28 — both of which this section had already measured as clear, and one of which it adopted by name. A rule that overrules its own evidence is the failure this clause exists to correct, in the other direction.

Both defects were client and respondent **names** — which is the pattern worth remembering. Wherever somebody thought about Thai they set 1.7 and it is correct; Thai arrived unannounced in the places that hold a person's name, where a Latin-tuned heading value had been chosen and never revisited.

`--ink-muted-48` also carries the Thai sub-line under every question, which is why the contrast correction in §1 matters more here than the number alone suggests.

---

## 3 · Space, shape, elevation

### Spacing

Apple's tokens, 8px base:

```
xxs 4 · xs 8 · sm 12 · md 17 · lg 24 · xl 32 · xxl 48 · section 80
```

**Team app** uses up to `xxl` (48px) between major sections and `lg` (24px) inside cards — the store-surface rhythm.
**Client survey** may use `section` (80px) around the welcome and completion screens — the marketing rhythm. Nowhere else.

The `md` value of 17px is not a mistake: it matches the body font size and shows up throughout Apple's own layouts.

### Radii

```
none 0 · sm 8 · md 11 · lg 18 · card 26 · sheet 34 · pill 9999
```

- `pill` — buttons, chips, tags. **The pill is the action signal.**
- **Inputs came off this list on 18 August 2026**, and the rule above is why: a
  box you type into is not an action, and a pill field reads as a button that
  happens to hold text.
- **One field is a pill anyway: the Collection bar's date, from 19 August 2026.**
  The rule protects a field from looking like the action *on a form of fields* —
  three inputs down a column with one Create under them, which is the New survey
  sheet and is untouched. The bar is not that shape: one line, exactly two
  controls on it, and the other is a pill. There the field is half of a pair, and
  matching its neighbour is what makes them read as one object instead of a
  control and a button that happened to land side by side. Scoped to
  `.collbanner .dpfield`, with the 20px of padding a pill needs to clear its own
  curve, and both at 44 — two pills of different heights on one line is the only
  thing you can see.
- **The two surfaces then split, later the same day.** The survey keeps `lg`: a
  field there *is* a card on a page of cards, sized to be answered on a phone. The
  team app went to `md` — 18px on a 44px box curves through most of its own
  height, and beside a 34px sheet and 26px cards it read as a third rounded thing
  rather than as the plainest control on screen. 11px on 44 is a corner, not an
  arc. `.opt` and `.linkbox` moved with it; one radius on every control in a team
  form.
- **So did the team app's package selector, later the same day.** The New survey
  sheet had three radii down one short form — an 18px text field, two fully-round
  package options, an 18px date field — and the options were the odd one. A pill
  means *press me*; a thing you choose *between* is the quietest job on that
  sheet, and giving it the loudest shape in the system left the Create button
  with nothing of its own to say. One radius on every field now, and exactly one
  pill on the sheet. `.linkbox` came off `sm` in the same pass, for the same
  reason: it was a fourth.
- `lg` (18px) — the survey's cards: the answer field, the choice tiles, the boards
- `sm` (8px) — compact utility buttons
- `md` (11px) — pearl ghost capsules

Do not use values between these. No 12px, no 16px.

**`card` 26 · `sheet` 34 — the team app only, added 18 August 2026.** Apple's
own numbers, from `guidelines/spacing-radii.html` in the iOS & iPadOS 27 system.
A third was tried and dropped the same day: Apple's popover radius of **38** is
sized for an iPad popover covering much of a tablet, and on a 240px menu it
curves in far enough to crowd the first and last rows. The popovers take `card`,
which is what a menu of rows is.

They are separate tokens rather than new values for `lg`, and that is the point:
both surfaces share every token above, so moving `lg` to 26 would round the
client's answer field too. `--r-card`, `--r-sheet` and `--r-pop` are referenced
from team surfaces and nowhere else.

They read large beside 18 because Apple calibrates them against a phone's own
40px screen corner. A browser window has no screen corner, so they are used on
the objects that *float* — the sheet, the popovers, the worklist and the cards
that sit on the parchment — and not on everything that has a border. The survey
is untouched and stays on `lg`.

### Two surfaces

The parchment inversion above is the **team app's** rule and stays exactly as written: a grey page, white cards, hierarchy carried by which surface something sits on.

**The client survey is flat.** One colour, no cards, decided 13 August 2026. Two reasons, and the first is the one that matters:

1. **Anything that overlays a page has to match it, and only a flat surface allows that.** The survey pins a question while its scales scroll under it, and lays a blur under its controls. Both paint a colour onto the page. There was a wash here — white ramping into parchment over the first 340px — and the pinned question drew a visible white box around itself at whatever height it happened to be, because a solid colour cannot match a gradient.
2. A survey shows **one question at a time**. Nothing needs lifting off anything, so a card would be a container with nothing to contain.

This is not the two-volumes idea in section 7 stretched further. It is a second surface rule, and the reason it is allowed is that each surface earns its own: a worklist has layers, a single question does not.

### Materials — blur and scrim

The system's vocabulary is ink, line and surface. Two materials are admitted beyond it, and only for the jobs named here.

**A fade** sits under a control that content scrolls beneath: the page's own colour, opaque at the floor, ramping to nothing over about 150px. Not a hard band — that only moves the cut to where the band starts.

**A blur ramp** closes the team sheet's pinned bar, added 18 August 2026. Three
bands under its lower edge, each masked to a shorter strip with a heavier blur,
so the transition is a gradient of *focus* rather than opacity over one blurred
slab — a single band shows a hard top edge wherever the blur starts. It replaced
the hairline that used to close the bar: a line says the content stops there,
and the content does not stop, it runs underneath.

**This is the effect removed on 13 August, and what makes it safe here is
structural.** That one was a `position: fixed` sibling of the survey's question
deck. This is `position: sticky` *inside* the scroller it covers — one
compositing layer, nothing to arbitrate. The team sheet scrolls as a whole for
exactly this reason; with the body scrolling instead, content stopped at the
bar's edge and there was nothing to blur. **The survey still has none, and the
condition is unchanged: move its controls out of the deck first.**

**Glass was admitted on 18 August 2026 and withdrawn the same day.** The sheet's
pinned bar and both popovers carried `backdrop-filter: saturate(180%) blur(20px)`
over a 72% tint for about an hour. It worked — the team app's surfaces are a
native `<dialog>` in the top layer and two absolute panels in a bar, none of
them the `position: fixed`-inside-a-scroller case below. It came out anyway: the
system's vocabulary is ink, line and surface, and a translucent bar is a fourth
material that has to be explained every time somebody asks why one surface
behaves differently from the rest. The Edge under the bar already says where the
bar ends.

The shape from iOS 27 stayed. The material did not.

**Removed 13 August 2026 — it was a progressive blur.** Four stacked backdrop-filter layers, radius doubling toward the edge, each masked to a narrower strip. On a real iPhone it painted over the buttons and blurred them, and the cause was not the blur. **A `position: fixed` element inside a scrolling container is attached to that scroller's compositing layer**, and the survey's controls live inside the deck; the blur, a sibling of the deck, composited above the entire scroller. z-index does not arbitrate across compositing layers — which is exactly why the send screen, whose controls are not inside the deck, never showed the fault. `will-change: transform` on the controls did not help; it is a hint, and WebKit declined it.

So a blur here costs a structural change: the control row has to be lifted out of the deck to the shell, which on a surface where scrolling *is* the navigation is not a small move. A painted gradient is never promoted to a layer of its own and cannot hit this at all. **If a blur is wanted again, move the controls out of the scroller first.**

**A scrim** may sit under text that falls on imagery, and it must be strong enough to guarantee 4.5:1 against the *palest* image the slot can ever hold — not the ones currently in it. On the mood boards a 0.82 black left the Thai line at 2.84:1; 0.92 gives 5.03:1 and holds whatever the picture does.

Neither is ever decoration. Glass for the look of glass is still banned, and both are still forbidden in the team app, which has no imagery and no floating controls.

### Elevation — zero shadows

Apple uses exactly one drop-shadow, and it exists only under product photography resting on a surface. **This product has no product photography, so it has no shadows at all.**

Depth comes from three sources only:

1. **Surface change** — white card on parchment page
2. **Hairline** — 1px `--hairline` on cards and inputs
3. **Backdrop blur** — sticky headers and bars: `background: rgba(245,245,247,0.8); backdrop-filter: saturate(180%) blur(20px)`

The focus ring is the one exception: `outline: 2px solid var(--primary-focus)`.

Never place a shadow on a card, a button, a panel or text.

---

## 4 · Motion

Apple's system-wide press state, adopted:

```css
button:active { transform: scale(0.95); }
```

Everything else stays quiet. Panel entrance 420ms, list stagger 70ms, state changes 300ms, feedback 180ms — all on `cubic-bezier(0.22, 1, 0.36, 1)`. No bounce, no spring.

**The survey's question change** — a state change, so 300ms on that curve. The content arrives 16px from the direction the survey just moved: forward from below, back from above. Added 13 August 2026 when scrolling stopped being the navigation, and it is not decoration — scrolling used to carry that information for free. On a screen where every question looks like the last one, direction is the only thing telling a respondent whether they went forward or back.

**The controls do not move.** Continue and Back are furniture, anchored to the floor of a phone precisely so that twenty-one advances are not twenty-one small re-aims; a control that slid on every press would undo that. Only the content column animates.

Sixteen pixels, not a viewport. A full-height slide is a different product's motion and cannot be read inside the 300ms this system allows anyway. And the fill is `backwards`, never `forwards` or `both`: the personality battery's question is `position: sticky` inside the animated element, and a transform retained on its ancestor would give it a new containing block and break the pinning it depends on.

Document default and pressed states only. The source analysis explicitly declines to document hover; follow that — hover may tint, but no layout may depend on it.

```css
@media (prefers-reduced-motion: reduce){
  *, *::before, *::after{
    animation-duration:.01ms !important;
    transition-duration:.01ms !important;
  }
}
```

---

## 5 · Components

### Buttons

**Primary** — `--primary` fill, white text, `body` (17px/400), `pill` radius, padding `11px 22px`. Focus `2px solid --primary-focus`. Active `scale(0.95)`.
Only one visible per region — and on the client survey, only once in the whole flow.

Where a primary sits beside a secondary on a phone's floor, the primary takes all the width the secondary leaves. Its label is centred in the button, which is not the centre of the screen — that is correct: the label belongs to the button, and the button is what the thumb aims at.

**Ghost pill** — transparent fill, `--primary` text, 1px `--primary` border, same size and radius. The second CTA when two appear together.

**Pearl capsule** — quiet secondary actions. `--surface-pearl` fill, `--ink-muted-80` text, `caption` (14px), 3px `--divider-soft` ring, padding `8px 14px`.

**Corrected 13 August 2026, twice over.** Its radius was `md` (11px), which contradicts the rule in section 3 that anything reading as an action is a pill — and a quiet secondary action is still an action. It is `pill`.

And its fill depends on the surface beneath it. Pearl was chosen against the team app's parchment page; on the client survey's flat page, pearl is all but invisible, so the quiet action there is `--canvas` with a 1px `--hairline` and an `--ink-muted-48` glyph. Same object, same weight, different ground.

**Icon button — a white disc with the Edge.** `pill` radius, `--canvas`, 1px `--hairline`, `--glyph` mark. **Changed 18 August 2026**: it was `--surface-fill`, a warm grey, and on a parchment sheet that is a control the same temperature as the paper under it. White is the one surface here that is not the page — it is what the team app's cards are made of — so the disc reads as an object *on* the sheet. White on parchment is 1.06:1 and carries no boundary of its own, which is what the border is for; hover and press move the border and the ground rather than the fill. **52px where a thumb uses it** — the survey's back control, everywhere it appears — and **40px where only a cursor does**, which is the deck's stepper pair, hidden below 620px because swiping already does its job. The glyph scales with the disc (24px at 52, 18px at 40) so the mark holds its proportions instead of growing chunky in a smaller circle.

Three states, no others: hover deepens the fill to `--surface-fill-deep` and takes the glyph to `--ink`; **press** deepens it again to `--surface-fill-press` and shrinks the disc to `scale(0.95)`, the same value the primary button uses. Press matters more here than anywhere else in the system — a touch device has no hover, so without it the only feedback for a tap is the screen changing, which on a poor connection is neither immediate nor obviously caused by the tap.

**The chevron.** 2.5px stroke, round cap and join, **arms at 45° — a right angle between them, 9 wide to 18 tall** — drawn about **a third of the height of the control** it sits in. One geometry, used by every chevron in the product.

**It is centred by eye, not by box** — **1.5px toward its point**, on whichever axis it points along. A chevron's open end spreads two strokes apart and covers area; its apex is a single node covering almost none, so the perceived weight is at the open end and a box-centred chevron reads as pushed that way. Inside a disc, which is perfectly symmetrical, there is nothing to hide it against — and with the apex landing near the middle, the mark stops being an arrow and becomes a clock hand.

**Corrected 13 August 2026.** This first went 1px the other way, reasoning that the round join fuses two strokes and concentrates ink at the apex. It does, but the effect is far smaller than the area the open end covers, and moving away from the point is the wrong direction twice over: it worsens the clock hand. Judged against a centre line at 1, 0, -1, -1.5, -2 and -2.5 — at 0 the apex sits on the line, and by -2 the mark has visibly overshot. It was a 1.27px hairline at half that presence, which reads as a lighter grey than it is set in, because a hair of a line does; and it opened to about 100°, which was an estimate read off a picture rather than the proportion UIKit actually holds.

`--glyph` exists because `--ink-muted-48` is tuned to the page: on a grey disc it measures 3.83:1 and looks pale. `--glyph` is 4.92:1 there, clearing even the text floor, and 3.96:1 on the pressed fill. Every chevron in the product now sits on that fill, so `--glyph` is the only value they take.

**Corrected 13 August 2026.** It was the quiet secondary above — `--canvas` inside a hairline. White inside a thin line on an almost-white page gives a control a boundary and no body: the ring reads as the object and the glyph sits in a hole. A control with no label has only its shape to be recognised by, so it gets a shape. It stays quieter than the accented action beside it because it is grey, not because it is barely there.

The glyph measures **3.83:1** on the fill — above the 3:1 floor for a graphical object, which is the thing carrying the meaning. The disc is 1.23:1 against the page and is not asked to carry any.

**Changed 17 August 2026 — the survey's back control is white.** Asked for. On the survey, and there only, the disc is `--canvas` with a 1px `--hairline` — the quiet-action treatment from two paragraphs above, the same object as `.pickone`. White is 1.07:1 against the parchment page, so the fill cannot draw the boundary and the hairline has to: it is 1.66:1 on white, and the `--glyph` chevron inside clears 11:1, comfortably past the 3:1 floor. Hover and press have no fill to deepen, so they step *off* white — `--parchment`, then `--divider` — and the line darkens to `--ink-3` with them. This is the 13 August correction below being spent back deliberately: it is the one control on the screen whose neighbour is the accented primary, so it can afford to be the page's own white and let the pill carry the weight. Everywhere else — the sheet header's back, the deck stepper — the disc stays `--surface-fill`.

**Corrected 13 August 2026 — the stepper is this too.** It was specified here as the exception: a bare glyph with no container until hover, on the grounds that it duplicates a gesture the scroll already offers and should not look as loud as the first way. What that produced was a control a pointer had to find before it looked like anything. Quieter is a matter of *size*, not of withholding the shape — so it is the same disc at 40px, and there is one icon button in this product rather than two that resemble each other.

**Dark utility** — `--ink` fill, white text, `caption` (14px), `sm` radius (8px), padding `8px 15px`. Neutral commits in the team app.

**The client survey's forward action is the accent, on every slide.** Start, Continue and Send answers are all `--primary`: `body` (17px), `pill` radius, 52px tall, full width on the phone's floor. Decided 13 August 2026, against the reading that ink should carry the twenty-one steps and blue only the final commit.

The argument for ink was that twenty-one blue buttons spend the accent everywhere. The argument that won is simpler: on a survey slide the accent has nothing to compete with. There is no "needs you" alert, no waiting-project dot, no second call for attention — the one thing a person must do is go forward, so the one accented thing is the way forward. A blue button on every slide is the accent doing its job, not diluting it.

This is the clearest case of the ten-percent ceiling in section 1 being about proportion of surface, not frequency across screens: one 52px button on an otherwise empty slide is well inside it.

The team app is unchanged. There the accent has real competition and the hierarchy in section 6 stands.

**Text link** — `--primary`, no background. On dark surfaces use `--primary-on-dark`.

### Hover

One rule, because this drifted four times in a day: **a hover darkens the line to `--ink-3`, and nothing else.** A control that carries no text — an icon button — also takes its glyph to `--ink`, because it has nothing else to show the state with. No fill arrives, no colour changes, nothing moves.

Filled buttons are the exception and deepen their own fill: `--primary` to `--primary-deep`, `--ink` to black.

**Hover never uses the accent.** The accent means this needs you, or you chose this. Pointing at something is neither, and a blue hover beside an accent-marked selection makes the thing under the cursor read as more chosen than the thing actually chosen.

**Every hover rule is wrapped in `@media (hover: hover)`.** A touch device has no way to end a hover: on a phone, tapping a chip to deselect it left the hover state behind, so the deselected chip stayed marked. This is not optional and there is no exception — the codebase has none.

### Cards and containers

**Utility card** — the workhorse. `--canvas` white on the parchment page, 1px `--hairline`, `lg` radius (18px), padding `lg` (24px). No shadow.

Used for: the worklist container, brief sections, project detail blocks, library panels.

**List container** — utility card with internal rows divided by 1px `--divider-soft`. Rows carry their own padding; the container carries the border and radius.

**Dark tile** — `--surface-tile-1` (#272729), white text, radius `none` when full-bleed or `lg` when inset. Reserved for the survey welcome and completion screens, where a moment of drama is appropriate. Links inside use `--primary-on-dark`.

### Worklist row — needs the team

Inside a white utility card on the parchment page. Row padding `24px`, divided by `--divider-soft`.

- 8px Action Blue dot, then client name at `tagline` (21px/600)
- One sentence at `body` (17px), emphasis in `body-strong`, max 60ch
- Meta line at `caption` in `--ink-muted-48`
- One primary pill button, right-aligned

Below 660px the row stacks and the button moves under the text.

### Project table

The full project list is a real `<table>` — `<thead>`, `th scope="col"`, keyboard-focusable rows. Three columns:

| Column | Contents |
|---|---|
| Project | 8px Action Blue dot when the project needs the team · name at `body-strong` · package beneath at `caption` in `--ink-muted-48` |
| Answers | "3 answers" at `caption` in `--ink-muted-80`, then who answered — "Khun Tanawat", or "Khun Tanawat +2" — at `caption` in `--ink-muted-48` |
| Latest | Two lines of state at `caption` in `--ink-muted-48` |

Header cells at `caption-strong` in `--ink-muted-48`, 1px `--hairline` beneath. Body rows separated by 1px `--hairline`. **No zebra striping, no fills, no vertical rules.** Hover tints the row to `--canvas` — the same white-on-parchment lift used everywhere else. Cell padding `18px 12px`, top-aligned.

**The Stage column and its segment meter went on 17 August 2026**, with the kick-off. The meter
was N segments, 4px tall, reading "Analysis · 4 of 5", and its own spec insisted the count follow
the package rather than being hard-coded — which was the tell. A project here is collecting
answers or it has a summary; five dated stages were a progress bar drawn over two states, four of
them advancing only when somebody remembered to advance them. The Latest column already says the
true thing, in words. **Do not reintroduce it**: if a state matters, it belongs in Latest.

Below **820px** the `<thead>` is visually hidden (`clip: rect(0 0 0 0)`) and each row becomes a stacked block; `td[data-label]::before` reprints the column name as a `fine` label above each value. No horizontal scrolling on a phone.

An empty cell is a defect. Where there is nothing to report, say so — "none yet", "nobody named".

### Inputs — two forms

The **team app** uses the pill: 44px tall, 1px hairline, `--r-pill`, white on parchment. It sits in dense forms beside other controls and needs an edge.

The **client survey** uses a rule: no border but a 1px baseline, transparent, type at `clamp(1.25rem, 2.6vw, 1.6rem)`, growing with its content to about half the screen and then scrolling inside itself. One question holds the screen there, so the field needs no edge to separate it from anything — and a box around the only thing on the page is a box around nothing.

Both take the same focus treatment: the ring is the accent, and it is the single exception to zero shadows.

### Inputs

`--canvas` fill, 1px `--hairline`, **`lg` radius**, padding `12px 14px`, height 44px, text at `body` (17px).

**It was `pill`, changed 18 August 2026.** The argument for it was Apple's search
field, and a search field is the exception that proves the rule — it is a
control you *invoke*, sitting in a bar, and it looks like a button because it
half is one. Everything here called an input is a value somebody types and
leaves: a client's name, a due date, a project's name typed to confirm deleting
it. Beside the actual pills on the same sheet they read as buttons holding text.

14px of horizontal padding, not 20. A pill needs the extra to clear its own
curve before the text starts; a rectangle does not.

Multi-line textareas were already `lg`, on the reasoning that a pill cannot hold
three lines. The single-line case now agrees with them for a better reason than
its own geometry: **the pill is the action signal, and a field is not an
action.**

Focus: `outline: 2px solid --primary-focus`, offset 2px. No border-colour change, no ring shadow.

Placeholder `--ink-muted-48` — at the corrected `#6e6e73` this meets 4.5:1 on both white and parchment. Do not lighten.

### Option chips

`--canvas` fill, 1px `--hairline`, padding `12px 16px`, `caption` (14px). Radius is `md` in the team app and `lg` on the survey — see Radii. Selected: **pale `--primary-tint` field, 2px solid `--primary`**, label stays ink, padding drops a pixel so nothing shifts.

**Corrected 18 August 2026.** Selection was a 2px `--primary-focus` border on an unchanged fill — a blue-grey borrowed from the focus ring, which already means *the keyboard is here*. Two states in one colour, and neither of them the accent this system actually reserves for choice. The survey's own chips had settled the right ladder months earlier and it holds everywhere now:

```
hover      white field, 1px orange line       — you are pointing at this
selected   pale orange field, 2px orange line — you chose this
button     solid orange, white label          — this is the action
```

Three rungs in one hue, separated by how much orange each spends. Use it for package pickers, question types, word chips and the day cells in a calendar.

### The way out of a sheet — chevron or close

Two sheets, two exits, and which one depends on what the exit *does*.

**A chevron disc on the leading edge** when the sheet retraces a step. The answers sheet returns to the project it was opened from, not to the page behind it; the insights sheet does the same. That is navigation, and the chevron is the symbol every phone and window on the machine has taught.

**A close disc on the trailing edge** when the sheet dismisses. The New survey form and the sheet handing over its link go nowhere — there is only the page underneath, and closing is the end of the task rather than a step back through it. `dismiss` on `Sheet`.

**This is a partial reversal of 17 August 2026**, which took a text `Close` pill off the trailing edge because it sat in the same group as the things you can *do* here. That reasoning stands, and is why the close is a disc set outside `.bartrail` with its own gap rather than a pill inside it: furniture belonging to the sheet, not one of its actions. What changed is only that a sheet with nothing behind it was being given a symbol for going back.

### Split button — run it, or say what it runs on

One control, two halves: a filled primary and a 42px chevron sharing a pill, seamed by a line of the label's own colour at 24%. The chevron opens a dropdown that changes what the primary will read; the primary's label reports the answer — *Generate insights* when everything is ticked, *Generate from 3 answers* when it is not.

Use it where a second button would not be an alternative but a qualifier. The insights banner had *Generate insights* beside a quiet *Select responses*, and read as two things you could do; the second does not generate anything, it says what the first reads. Set as halves of one pill that relationship is the shape rather than a caption.

Everything is ticked when the dropdown opens. It refines a default, and a default that has to be assembled before the button works is not a default.

The dropdown is `position: fixed` and placed by `useAnchored` — see Date field for why a popover in a sheet body cannot be absolute. One respondent, no chevron: choosing between one person and nobody is not a choice.

### Date field

Three boxes and a month you can point at, replacing `<input type="date">` — the one control on a team sheet the system could not reach, because the browser draws its own segment highlight, glyph and popup in its own colours inside our field.

The field is an `.input` built from the same numbers: 44 tall, `md` radius, the Edge, and the input focus ring — borrowed onto the box, because focus actually lands on a segment and a ring around a 2ch span reads as a defect. Segments are `tabular-nums` so a day does not shuffle the month sideways as it is typed; type digits and the caret hops boxes, arrows step and wrap. Order is **day / month / year**, matching every other date the team app prints.

Two quiet discs on the trailing edge: clear, and open. Neither is the action on the sheet, so both are `--ink-3` earning ink on hover.

The calendar is `position: fixed`, Monday-first, with day cells on the chip ladder above. Fixed, because absolute would count toward the sheet's scrollable height — the point of the sheet hugging its content is lost if opening a calendar grows a scrollbar — and because `.sheet` is `overflow: hidden` for its own corners and would clip it. Fixed has one cost: an ancestor with a transform, filter or `will-change` becomes its containing block, so the coordinates are measured against whatever that turns out to be. The sheet's entrance animation is exactly such an ancestor for 420ms.

### Tags

### Tags

`fine` (12px), `pill` radius, padding `3px 9px`, uppercase with `0.04em` tracking.
Severity high `--critical-tint`/`--critical` · medium `--caution-tint`/`--caution` · live or decide `#e8f1fb`/`--primary`.

**Correction, 13 August 2026 — the neutral tag.** It was `--divider-soft` under `--ink-muted-48`, which measures **4.45:1**: under this product's own 4.5:1 floor, and 12px is not large text. The neutral tag is now `--canvas` with a 1px `--hairline` and `--ink-muted-48`, which measures **5.07:1**. Any tint checked only against white will fail on the parchment page; this one failed against its own tint.

Always accompanied by text — the tag is the label.

A tag is not an action. It shares the pill with buttons because it is a label with ends, not because it can be pressed — which is why a tag is never filled with ink or the accent. Filled pill plus accent or ink means press me; outlined pill in muted ink means this is what that is. The survey's question number is the latter: `11/21`, quiet, on a fixed 40px width so that every question's text starts on the same left edge.

### Progress and position

The system had no spec for either, which is why the survey's question number moved through four different treatments in one day. Both are specified here now.

**The bar.** 3px, sticky at the top of the scroller, `--divider` track and `--primary` fill. It animates `transform: scaleX()`, never `width` — width relayouts the page, and this moves on all twenty-odd advances. It is hidden on the welcome screen: a bar at zero reads as something broken rather than as nothing yet done.

**The number.** `6/21` as a line of muted text above the question — `--ink-muted-48`, 13px, weight 400, 9px clear of the heading. No container, no fill, no border, no fixed width, and the same on every breakpoint.

**Why it is not an object.** It has been an ink block, an 8px block, a filled pill and an outlined pill. Every one of those sat beside the question, and every one needed the same machinery to keep the question's own text aligned with the answer beneath it: a fixed width, a negative margin, and the identity `margin-left + width + margin-right = 0`. That arithmetic produced three defects in a day — `1/21` sitting ten pixels left of `10/21` because the width was content-sized, digits touching the curve on the phone because the padding was zero, and a hanging indent a seventh of a phone wide. As a line of its own it needs none of it: the number, the question, its wrapped lines, the help text, the language reveal, the answer and the button all begin at the container's edge because nothing is pulled out of it.

**This element is not from Apple, and that is deliberate.** Apple has no such thing. Its badge means unread or pending — attention, which is the opposite of position — and its answer for "where am I" is the progress indicator alone; its own survey product shows a bar, a question, and no number. The count is kept because twenty-one questions is long enough that people want to know how many are left, and a 3px bar cannot tell them. As plain text above the heading it is closer to a navigation subtitle than to a badge, which is the nearest thing Apple's system does have.

It is an eyebrow above a heading, a pattern that is usually a defect. It earns its place under the one condition that redeems it: the sequence itself carries information the reader needs.

### The insights panel — two bands, two jobs

One object, split by the recessed ground into the two things the section is for.

- **Above the line: what exists, and how to read it.** The eyebrow — the Point
  and NEEDS YOUR TEAM when a person is needed, the panel's own name in muted
  caps when not — the state in a sentence, when it was written and how many runs
  are kept, and *Open the insights*.
- **Below it, on `--parchment`: what a new run would read, and how to run it.**
  The reading meter, the sentence beside it, and the split *Generate* button.

**The accent goes to the band that has something to give.** *Open the insights*
takes it whenever there is an analysis; *Generate* steps back to an outline the
moment there is, and takes the accent only when there is nothing to open. Either
way exactly one primary is visible — the floor's item 6 — and it is the one
somebody opened the sheet for. Re-running costs money and minutes and is rare;
reading is why they are here.

Both buttons used to sit in the foot, which made the foot do two jobs and left
the head as four inert lines. Asked for 19 August 2026, and it is the split the
two bands were drawn for.

### The reading meter — what the analysis will read

One 3×15px pill per person who answered, on the insights panel beside the line
that says the same thing in words. **Every mark names its person** — `title` for
a pointer, and a `role="img"` label on the row naming whoever is being left out
— because *how many* is what the sentence already says and *whose* is the thing
only the marks can carry. Solid `--ink` for the answers this run will read
(15.18:1), solid `--ink-4` for the ones the picker has unticked (3.72:1).
**Nothing renders below two respondents**: PRODUCT.md says one person answering
is the normal case, and a single mark beside a sentence is a stray pipe
character next to the words that already say it.

**This is the only animated element in the team app**: while the analysis runs
the marks pass a wave left to right, each delayed by its own index, so the
motion is the shape of what is actually happening — it is reading them, one
after another. The trough is 0.55, which measures 3.71:1; it was 0.28, at which
the one signal that the machine is working faded to 1.80:1 twice a second.

**It is what "feels like AI" here, and it is a count rather than an effect.**
Nothing on screen exists in order to say *machine*: the marks are there before,
during and after the run, and the animation is opacity on marks that were
already drawn. No sparkle glyph, no shimmer sweep, no gradient. What signals
that something was written by a machine in a serious tool is provenance — what
it read, when, and that the last run is still there — not ornament.

- **Ink, not the accent**, though the marks do report a choice. The accent is
  spoken for on that panel by *Generate*, and §1's ladder says nothing may take
  a rung above its importance. What the analysis reads is a fact about the run;
  the run is the thing being urged.
- **Opacity only, and only while running.** A wave built on `width` or
  `background-color` repaints a row of marks for the length of an API call.
  `prefers-reduced-motion` drops the animation and leaves every mark at full
  opacity. The on/off colour change carries **no transition** — it is a paint
  property, so it only advances while the page composites, and a tab that is not
  painting left the mark stuck on the colour it started from.
- **Never opacity for the off state.** The first build drew it as `--ink-4` at
  45%, which composites to `#bcbec2` — **1.68:1**, against a 3:1 floor — while
  the comment beside it quoted the solid colour's 4.61:1. The mark carrying the
  whole point of the meter could not be seen. Contrast is measured on the
  composited result or it is not measured.
- **Rules 3 and 7 hold.** These are the people who actually answered — never a
  fraction of an expected number, never a proportion of anything.

### Sticky bars

Sub-nav, sheet headers, brief action bars: `rgba(245,245,247,0.8)` with `saturate(180%) blur(20px)`, 1px `--hairline` edge, height 52–64px.

### Sheets

Full-screen dialog. Backdrop `rgba(0,0,0,0.32)`. Inner sheet 760px on `--canvas-parchment`, entering with an 18px rise over 420ms. Body padding `32px 28px 72px`.

**The header is a toolbar**, in three slots: **back · title · actions**.

Back is the **52px disc** specified under *Icon button* below — `pill` radius, `--surface-fill`,
no border, the shared `--glyph` chevron — at the far leading edge, on its own. 44px where only a
cursor reaches it. It was a text `Close` pill on the trailing edge until 17 August 2026; Apple's
HIG asks for the standard symbol, at the leading edge, and never the word, and it is the one
glyph this product spends (see `docs/navigation-decisions.md`). It is the same object as the
survey's back control, at the same size, drawn from the same component — except for its fill,
which stayed `--surface-fill` when the survey's went white on 17 August 2026.

Actions take the trailing edge — one visible at most, the rest behind **More** — and the body
describes rather than acts. They are **bare marks, not discs**: 44px hit area, a 20px glyph at
`--ink-3` (6.02:1 on parchment, twice the 3:1 a graphical object must clear), no border and no
fill until hover, which lifts to `--canvas` like every other quiet control. The HIG's reason is
that the bar is already the container — *"Borders … aren't necessary because the section provides
a visible container"* — and the practical one is that the back disc has to stay distinct from
them, which three identical discs in a row would have destroyed.

Three marks, and no more: **chevron** (back), **chain link** (copy link), **ellipsis** (more).
Each carries a tooltip and an accessible name; Copy link turns into a **tick** for two seconds and
announces itself into a live region, because a swapped glyph is silent to a screen reader. The header was sticky and frosted over `rgba(245, 245, 247, 0.8)`
until the same day; it is the sheet's own parchment now, with a permanent hairline, because a
sheet always has content under its header.

---

## 6 · Page structure

The team app is **one landing page**. There are no tabs and no sidebar.

0. **The toolbar** — sticky, no background of its own, a hairline that appears only once content
   is under it. Leading: the wordmark, then one title slot holding the date until the greeting
   scrolls under the bar and **"Needs you · 1"** after. Trailing: More, fixed space, then the one
   primary action, **New survey**, last. Spec and the Apple HIG reading behind it are in
   `docs/navigation-decisions.md` and the header of `app/toolbar.tsx`.
1. **Needs you** — white utility card on the parchment page, rich rows, one Action Blue pill each
2. **All projects** — the table, action-needed rows first, marked with the blue dot

**Nothing at the foot.** Three destinations sat there until 17 August 2026. *Question templates*
went with the fixed questionnaire and *What's coming* with the kick-off; **Past projects** went
upward the same day, into the toolbar's More menu, because a destination at the foot of a
ten-row table is the longest reach in the app for work the team returns to.

Everything else is a panel opened from this page. Navigation holds places you can go; this product has one place.

The two project sections are not redundant: the first answers *what do I do now*, the table answers *where does everything stand*. The dot links them.

## 7 · Two volumes

| | Team app | Client survey |
|---|---|---|
| Model | Apple store / configurator | Apple marketing tiles |
| Page | parchment | parchment, with dark tiles at welcome and completion |
| Section rhythm | `xxl` 48px | `section` 80px |
| Largest type | `display` 40px | `hero` 56px |
| Density | utility cards, 24px padding | one question group per screenful |
| Purpose | answer "is anything waiting on me" in 15 seconds | make a first impression worth 20 minutes |

Same tokens, same accent, same pill grammar. Different volume.

**Amended 13 August 2026 — the survey is no longer only Apple at a different volume.** Its interaction pattern is now Typeform's: one question per screen, scroll-snap as the navigation, an underlined answer rather than a filled field, OK plus Enter, and a numbered tag beside the question. That was a deliberate choice against a pinned reference, not drift.

What stayed Apple: the palette and the accent's meaning, the type ramp and the Thai leading rule, the pill as the action signal, the radii, the spacing scale, zero shadows, and the rule that one screen has one primary action.

What is Typeform's: the pacing, the underlined input, and the question tag.

Recording it because an undocumented borrowing looks like an oversight, and the next person to open this file should be able to tell a decision from a mistake.

---

## 8 · Do and don't

**Do**
- Use Action Blue for every interactive element and nothing else
- Run body copy at 17px — it defines the reading pace
- Express hierarchy through surface change: white card on parchment
- Reserve the pill for anything that reads as an action
- Use `scale(0.95)` as the press state on every button
- Set 1.6 minimum leading on any line containing Thai
- Keep weight 500 out of the ladder
- Say a status in words, not a glyph

**Don't**
- Introduce a second accent colour
- Add a shadow to any card, button, panel or text — there are no shadows in this product
- Use gradients, glassmorphism as decoration, or decorative grid backgrounds
- Round a full-bleed dark tile
- Tighten body leading below 1.44 in Latin or 1.6 in Thai
- Mix radii grammars — 8, 11, 18, pill, and nothing between
- Use `--primary-on-dark` on a light surface
- Apply the 80px marketing rhythm to the team app
- Put two colours in one line of text
- Use a coloured glyph as a status marker
- Stripe, fill or rule the project table

---

## 9 · Responsive

Structural breakpoints from the source, reduced to those this product needs:

| Width | Change |
|---|---|
| ≥1069px | Full layout, 880px app content lock |
| 834–1068px | Worklist rows keep horizontal layout; sheets go full-width |
| 641–833px | Worklist rows stack, button below text |
| ≤640px | Single column throughout; `display` drops 40 → 34px; page padding 32/20 |
| ≤419px | `display` drops to 28px; survey `hero` drops 56 → 34px |

Touch targets minimum 44 × 44px. Inputs are exactly 44px tall, matching Apple's search input.

---

## 10 · Before any screen is done

1. Reads correctly in Thai — no clipped tone marks, leading ≥1.6
2. No horizontal overflow at 390px
3. Body text ≥4.5:1; every state carries a text label
4. Keyboard reachable; focus ring is `2px --primary-focus`
5. `prefers-reduced-motion` honoured
6. Exactly one primary button visible
7. Action Blue appears only where a person must act or has chosen — never on hover, never decorative
8. No shadows anywhere; blur and scrim only for the two jobs in section 3
9. Radii are only 8, 11, 18 or pill, and anything that reads as an action is a pill
10. Weights are 300 / 400 / 600 / 700 — 500 is not in the ladder
11. Spacing uses the token scale
12. No line of text carries two colours
13. The right surface for the surface: flat on the client survey, cards in the team app
