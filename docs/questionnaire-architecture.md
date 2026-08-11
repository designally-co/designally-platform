# Questionnaire architecture — shared blocks, not separate templates

_Designally Platform · rewritten 11 August 2026 for the version-2 questionnaire, amended the
same day for version 3_

## The finding

The branding team's questionnaire arrives as two packages, and **Part 2 is identical in both** —
word for word, in both languages. Diffed, it is zero lines apart.

That is the same shape as the original finding, which was that the Website survey's "Brand
Essentials" section *was* the Branding template. One library of blocks, not parallel templates.

## The blocks

Implemented in `seed/question-blocks.json`, imported by `npm run db:seed`.

| Block | Contents | Used by |
|---|---|---|
| `identity` | name · email | both packages |
| `strategy` | Package A Part 1 — 14 questions | Brand |
| `project` | Package B Part 1 — 4 questions | Design |
| `visual` | Part 2 — 7 questions | **both packages** |

| Package | Blocks | Questions |
|---|---|---|
| **Brand** — Brand Strategy + Brand Identity | identity · strategy · visual | 23 |
| **Design** | identity · project · visual | 13 |

**Consequence:** editing a Visual Direction question once updates both questionnaires.

**A client buys one package or the other, never both**, so nobody is ever asked the visual block
twice. That was the risk `core` carried under the old model and the reason it existed.

## Why `identity` is ours and not theirs

The questionnaire does not ask who is answering. The platform adds it, because a conflict with no
names attached is not a finding — the brief has to be able to say *Khun A said this and Khun B
said that*, and the team has to know whose sentence they are about to put in a deck. Two answers
without names are one confused answer.

## Version 3 — identity is a name and an email

`identity` asked three questions. Two were removed on 11 August 2026 at the branding team's
request: **whether the respondent held final decision authority**, on the grounds that in practice
one person answers the survey so there is rarely anyone to rank; and **their role or position**,
replaced by a **contact email** so the team can follow up on an answer that needs it.

The block is now `name · email`, and the email is found by `maps_to: "email"` rather than by
position, so reordering the block cannot silently write an address into the wrong column.

**What the analysis lost.** It can no longer say *which* group holds a position — only who does.
On the ARUN+ test data the single most valuable finding was that the two largest departments held
opposite views of the customer, and that was found by grouping 28 answers by department. With a
name alone the brief must find its clusters in the answers themselves. That is a fair trade at one
or two respondents and a real loss at ten; if a project ever collects ten again, this is the
question to revisit.

**The email is never sent to the Anthropic API.** It is contact detail, not evidence — it tells
the analysis nothing, and it is the one field here that identifies a real person off this system.
`transcript.ts` sends the name and the answers.

`responses.decision_maker` and `responses.role` both stay in the database. Surveys sent at
version 2 collected real answers into them, and rule 5 means those surveys keep asking the
questions they were sent with. Nothing reads either column now.

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

The ten personality scales run **1–5**, as they did in version 1.

Version 2 ran them 0–10, where 0 was a position — "fully Traditional" — and not an absence of one.
The branding team asked for five points back on 11 August 2026, and five is the better shape here:
eleven 44px touch targets need 484px in a row where a 390px phone offers 350, so they had to be
numbered and allowed to wrap. Five fit one row as the prototype's graded dots, where the size of
the dot carries the position and no reading is required.

`start` and the wrapping `pts-wide` rendering both stay. A survey sent at version 2 still has
eleven-point scales and must still render (rule 5). Absent, `start` means 1.

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
