# Design System — Designally Platform

Derived from the Apple design analysis. This document is the build reference; where it departs from the source analysis, the departure is stated and justified.

Two things had to be resolved before the Apple system could be used here:

**SF Pro has no Thai glyphs.** Half of this product's text is Thai. The source analysis names Inter as the off-system substitute; Inter has no Thai either. Section 2 resolves this with a paired face and a leading rule.

**Apple's homepage grammar is a marketing grammar** — 80px section padding, one tile per viewport, photography as the subject. A worklist built that way would show one item per screen. The source document itself provides the answer: *"Store and shop surfaces retain the same chassis but switch modes"* and *"this is one design language expressed at different volumes."* So the team app is modelled on Apple's **store and configurator surfaces**; the client survey, which is a first impression and deserves air, is modelled on the **marketing surfaces**. Both are Apple, at different volumes.

---

## 1 · Colour

Adopted from the source almost unchanged. One accent, no gradients, no decorative colour.

```css
/* action */
--primary          #0066cc   /* Action Blue — every interactive element */
--primary-focus    #0071e3   /* focus ring only */
--primary-on-dark  #2997ff   /* links on dark surfaces */

/* ink */
--ink              #1d1d1f   /* headlines, body, dark buttons */
--ink-muted-80     #333333   /* secondary text */
--ink-muted-48     #6e6e73   /* meta, disabled, fine print */
--on-dark          #ffffff
--body-muted       #cccccc   /* secondary text on dark */

/* surface */
--canvas           #ffffff   /* raised: cards, sheets, inputs */
--canvas-parchment #f5f5f7   /* the page */
--surface-pearl    #fafafc   /* ghost button fill */
--surface-fill     #dedee1   /* icon-button fill */
--surface-fill-deep #d4d4d8  /* its hover */
--glyph            #5c5c61   /* an icon sitting on that fill */
--surface-tile-1   #272729   /* dark tile */
--surface-black    #000000   /* true void — rare */

/* line */
--hairline         #e0e0e0   /* card and input borders */
--divider-soft     #f0f0f0   /* internal dividers, ghost button ring */
```

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

### The pairing

SF Pro renders no Thai. The stack is:

```css
--font-latin: "Inter", system-ui, -apple-system, "SF Pro Text", sans-serif;
--font-thai:  "Noto Sans Thai", "IBM Plex Sans Thai", sans-serif;
```

`system-ui, -apple-system` resolves to genuine SF Pro on macOS, iOS and Safari — most of your team and many Thai clients on iPhone get the real face. Inter carries every other platform; the source analysis names it as the correct substitute.

Thai runs in **Noto Sans Thai**, which shares Inter's proportions and x-height closely enough to sit on the same line without a visible step. IBM Plex Sans Thai is an acceptable alternative — you already have it in another project — but it runs slightly wider and needs testing in mixed lines.

Apply both together so mixed strings resolve per-glyph:

```css
font-family: var(--font-latin), var(--font-thai);
```

The browser falls through to the Thai face for Thai codepoints automatically. Do not wrap Thai in a separate element to switch fonts — your bilingual strings sit on one line (`Start · เริ่มทำแบบสอบถาม`) and splitting them breaks the baseline.

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
none 0 · sm 8 · md 11 · lg 18 · pill 9999
```

- `pill` — buttons, chips, inputs, tags. **The pill is the action signal.**
- `lg` (18px) — cards, panels, list containers
- `sm` (8px) — compact utility buttons
- `md` (11px) — pearl ghost capsules

Do not use values between these. No 12px, no 16px.

### Two surfaces

The parchment inversion above is the **team app's** rule and stays exactly as written: a grey page, white cards, hierarchy carried by which surface something sits on.

**The client survey is flat.** One colour, no cards, decided 13 August 2026. Two reasons, and the first is the one that matters:

1. **Anything that overlays a page has to match it, and only a flat surface allows that.** The survey pins a question while its scales scroll under it, and lays a blur under its controls. Both paint a colour onto the page. There was a wash here — white ramping into parchment over the first 340px — and the pinned question drew a visible white box around itself at whatever height it happened to be, because a solid colour cannot match a gradient.
2. A survey shows **one question at a time**. Nothing needs lifting off anything, so a card would be a container with nothing to contain.

This is not the two-volumes idea in section 7 stretched further. It is a second surface rule, and the reason it is allowed is that each surface earns its own: a worklist has layers, a single question does not.

### Materials — blur and scrim

The system's vocabulary is ink, line and surface. Two materials are admitted beyond it, and only for the jobs named here.

**A progressive blur** may sit under a control that content scrolls beneath. Not a single blurred pane — one pane only moves the hard cut to where the blur starts. Stack layers with the radius increasing toward the edge, each masked to a narrower band, so the cut becomes a ramp.

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

**Icon button — a filled disc.** 52px, `pill` radius, `--surface-fill`, **no border**, `--glyph` chevron. Hover deepens the fill to `--surface-fill-deep` and takes the glyph to `--ink`, per the rule below. This is the survey's back control, everywhere it appears.

**The chevron.** 2.5px stroke, round cap and join, **arms at 45° — a right angle between them, 9 wide to 18 tall** — drawn about **a third of the height of the control** it sits in. One geometry, used by every chevron in the product.

**It is centred by eye, not by box** — **1.5px toward its point**, on whichever axis it points along. A chevron's open end spreads two strokes apart and covers area; its apex is a single node covering almost none, so the perceived weight is at the open end and a box-centred chevron reads as pushed that way. Inside a disc, which is perfectly symmetrical, there is nothing to hide it against — and with the apex landing near the middle, the mark stops being an arrow and becomes a clock hand.

**Corrected 13 August 2026.** This first went 1px the other way, reasoning that the round join fuses two strokes and concentrates ink at the apex. It does, but the effect is far smaller than the area the open end covers, and moving away from the point is the wrong direction twice over: it worsens the clock hand. Judged against a centre line at 1, 0, -1, -1.5, -2 and -2.5 — at 0 the apex sits on the line, and by -2 the mark has visibly overshot. It was a 1.27px hairline at half that presence, which reads as a lighter grey than it is set in, because a hair of a line does; and it opened to about 100°, which was an estimate read off a picture rather than the proportion UIKit actually holds.

`--glyph` exists because `--ink-muted-48` is tuned to the page: on a grey disc it measures 3.83:1 and looks pale. `--glyph` is 4.92:1 there, clearing even the text floor. On the page — the bare stepper — `--ink-muted-48` is still correct. Same object, different ground, again.

**Corrected 13 August 2026.** It was the quiet secondary above — `--canvas` inside a hairline. White inside a thin line on an almost-white page gives a control a boundary and no body: the ring reads as the object and the glyph sits in a hole. A control with no label has only its shape to be recognised by, so it gets a shape. It stays quieter than the accented action beside it because it is grey, not because it is barely there.

The glyph measures **3.83:1** on the fill — above the 3:1 floor for a graphical object, which is the thing carrying the meaning. The disc is 1.23:1 against the page and is not asked to carry any.

**The chevron pair is not this.** The stepper on a pointer device stays a bare glyph with no container until hover, because it duplicates a gesture the scroll already offers. Giving it a disc would make the second way of doing something look as loud as the first.

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

The full project list is a real `<table>` — `<thead>`, `th scope="col"`, keyboard-focusable rows. Four columns:

| Column | Contents |
|---|---|
| Project | 8px Action Blue dot when the project needs the team · name at `body-strong` · package beneath at `caption` in `--ink-muted-48` |
| Stage | Segment meter, then `caption` label "Analysis · 4 of 5" |
| Answers | "3 answers" at `caption` in `--ink-muted-80`, then who answered — "Khun Tanawat", or "Khun Tanawat +2" — at `caption` in `--ink-muted-48` |
| Latest | Two lines of state at `caption` in `--ink-muted-48` |

Header cells at `caption-strong` in `--ink-muted-48`, 1px `--hairline` beneath. Body rows separated by 1px `--hairline`. **No zebra striping, no fills, no vertical rules.** Hover tints the row to `--canvas` — the same white-on-parchment lift used everywhere else. Cell padding `18px 12px`, top-aligned.

Segment meter: N segments, 4px tall, 2px radius, 3px gap. Done `--ink-muted-80`, current `--primary`, future `--hairline`. Segment count follows the package — never hard-code five.

Below **820px** the `<thead>` is visually hidden (`clip: rect(0 0 0 0)`) and each row becomes a stacked block; `td[data-label]::before` reprints the column name as a `fine` label above each value. No horizontal scrolling on a phone.

An empty cell is a defect. Where there is nothing to report, say so — "none yet", "nobody named".

### Inputs — two forms

The **team app** uses the pill: 44px tall, 1px hairline, `--r-pill`, white on parchment. It sits in dense forms beside other controls and needs an edge.

The **client survey** uses a rule: no border but a 1px baseline, transparent, type at `clamp(1.25rem, 2.6vw, 1.6rem)`, growing with its content to about half the screen and then scrolling inside itself. One question holds the screen there, so the field needs no edge to separate it from anything — and a box around the only thing on the page is a box around nothing.

Both take the same focus treatment: the ring is the accent, and it is the single exception to zero shadows.

### Inputs

`--canvas` fill, 1px `--hairline`, **`pill` radius**, padding `12px 20px`, height 44px, text at `body` (17px). Apple pills its search input; do the same for single-line fields.

Multi-line textareas use `lg` radius (18px) — a pill cannot hold three lines.

Focus: `outline: 2px solid --primary-focus`, offset 2px. No border-colour change, no ring shadow.

Placeholder `--ink-muted-48` — at the corrected `#6e6e73` this meets 4.5:1 on both white and parchment. Do not lighten.

### Option chips

Apple's configurator grammar. `--canvas` fill, 1px `--hairline`, `pill` radius, padding `12px 16px`, `caption` (14px). Selected: border upgrades to **2px solid `--primary-focus`**, fill unchanged.

Note that Apple signals selection with border weight, not fill — quieter and better for a grid of many options. Use it for package pickers, question types, decision outcomes and word chips.

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

### Sticky bars

Sub-nav, sheet headers, brief action bars: `rgba(245,245,247,0.8)` with `saturate(180%) blur(20px)`, 1px `--hairline` edge, height 52–64px.

### Sheets

Full-screen dialog. Backdrop `rgba(0,0,0,0.32)`. Inner sheet 760px on `--canvas-parchment`, entering with an 18px rise over 420ms. Header sticky and frosted; body padding `32px 28px 72px`.

---

## 6 · Page structure

The team app is **one landing page**. There are no tabs and no sidebar.

1. **Needs you** — white utility card on the parchment page, rich rows, one Action Blue pill each
2. **All projects** — the table, action-needed rows first, marked with the blue dot
3. **Three destinations** — Question templates · Past projects · What's coming, as a plain row at the foot, each opening its own panel

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
