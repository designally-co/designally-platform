# Questionnaire architecture — shared blocks, not separate templates

_Designally Platform · rewritten 11 August 2026 for the version-2 questionnaire_

## The finding

The branding team's questionnaire arrives as two packages, and **Part 2 is identical in both** —
word for word, in both languages. Diffed, it is zero lines apart.

That is the same shape as the original finding, which was that the Website survey's "Brand
Essentials" section *was* the Branding template. One library of blocks, not parallel templates.

## The blocks

Implemented in `seed/question-blocks.json`, imported by `npm run db:seed`.

| Block | Contents | Used by |
|---|---|---|
| `identity` | name · role · final decision maker? | both packages |
| `strategy` | Package A Part 1 — 14 questions | Brand |
| `project` | Package B Part 1 — 4 questions | Design |
| `visual` | Part 2 — 7 questions | **both packages** |

| Package | Blocks | Questions |
|---|---|---|
| **Brand** — Brand Strategy + Brand Identity | identity · strategy · visual | 24 |
| **Design** | identity · project · visual | 14 |

**Consequence:** editing a Visual Direction question once updates both questionnaires.

**A client buys one package or the other, never both**, so nobody is ever asked the visual block
twice. That was the risk `core` carried under the old model and the reason it existed.

## Why `identity` is ours and not theirs

The questionnaire does not ask who is answering. The platform adds it, because everything the
analysis does with authority depends on it: weighting a conflict by who holds the decision, and
the red flag raised when nobody claims it (`docs/insight-engine-spec.md`). Without the block, a
conflict between two people is just two opinions.

## Retired blocks

`core`, `branding`, `website`, `ecommerce` and `content` are attached to no package. They stay in
the database and in `BLOCK_KEYS`.

This is rule 5 doing its job. A survey stores the question version and block keys it was sent
with, so a brief written from the old branding questionnaire still resolves its questions and
still reads correctly. Deleting a block key would orphan a real brief. `steps.ts` falls back to a
step per block for those surveys, using each block's own name from the seed.

## Question types — exactly five

`paragraph` · `short_text` · `multiple_choice` · `checkboxes` (optional min/max) ·
`linear_scale` (pole labels, point count, optional `start`).

`start` was added for version 2: the personality scales moved from 1–5 to **0–10**, where 0 is a
position — "fully Traditional" — and not an absence of one. Absent means 1, which is what every
version-1 question uses.

Eleven points do not fit one row of 44px touch targets on a 390px phone (484px needed, 350px
available). Wide scales number their buttons and wrap. A graded dot cannot wrap: position is the
only thing telling you what it is.

## No conditional blocks

Version 1 had one: `ecommerce` appeared only when the website block's feature list included an
online shop, declared as `triggers` in the seed. Version 2 has no conditional blocks, so nothing
is hidden and nothing is revealed. The trigger mechanism remains in the loader and is unused.

## Open with the branding team

Four question shapes were read from the source document rather than specified by it. Each is one
line in the seed to change, and a change lands as version 3 without touching a sent survey.

1. **Mood and Personality**, **Things to Avoid**, **Design Elements to Avoid** — the Thai says
   **เช่น** (for example), which reads as illustrations, but each says "choose N". They are seeded
   as checkboxes, because the adjective-cluster and avoid-list findings in the insight spec need
   answers that can be compared between respondents. Free text cannot be compared.
2. **"3D, Character"** — seeded as two elements, following the comma in the source. The PDF had
   none.
3. **"เลือก 3 สิ่งที่แบรนด์ของคุณจะรักษาไว้เสมอ"** — seeded as one paragraph, because no list is
   offered to choose from. Three separate fields would compare better.
4. **Package A has no Project Objective and no Usage/Application**; Design has both. Seeded as
   written rather than filled in.
