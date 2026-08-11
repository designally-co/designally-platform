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
--surface-tile-1   #272729   /* dark tile */
--surface-black    #000000   /* true void — rare */

/* line */
--hairline         #e0e0e0   /* card and input borders */
--divider-soft     #f0f0f0   /* internal dividers, ghost button ring */
```

**The parchment inversion.** The page is `--canvas-parchment` (#f5f5f7) and raised surfaces are pure white. This is the single most important structural borrowing: *surface change is the hierarchy*. Cards lift off the page because they are lighter, not because they have a shadow.

**Action Blue is the only accent, and it means "a person is needed here."** Every interactive element uses it; nothing decorative does. This survives unchanged from the previous system and matches Apple's own rule exactly.

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
Only one visible per region.

**Ghost pill** — transparent fill, `--primary` text, 1px `--primary` border, same size and radius. The second CTA when two appear together.

**Pearl capsule** — `--surface-pearl` fill, `--ink-muted-80` text, `caption` (14px), 3px `--divider-soft` ring, `md` radius (11px), padding `8px 14px`. Quiet secondary actions.

**Dark utility** — `--ink` fill, white text, `caption` (14px), `sm` radius (8px), padding `8px 15px`. Neutral commits — survey navigation.

**Text link** — `--primary`, no background. On dark surfaces use `--primary-on-dark`.

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
Severity high `--critical-tint`/`--critical` · medium `--caution-tint`/`--caution` · live or decide `#e8f1fb`/`--primary` · neutral `--divider-soft`/`--ink-muted-48`.

Always accompanied by text — the tag is the label.

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
7. Action Blue appears only where a person must act
8. No shadows anywhere
9. Radii are only 8, 11, 18 or pill
10. Spacing uses the token scale
11. No line of text carries two colours
