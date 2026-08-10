# Questionnaire architecture — shared blocks, not separate templates

_Designally Platform_

## The finding
Section 2 of the real Website Survey ("Brand Essentials", 10 questions) is **the same questionnaire as the Branding template** — same wording, same order, same personality scales.

## Therefore: block architecture
One library of blocks, not parallel templates. Implemented in `seed/question-blocks.json`.

| Block | Contents | Used by |
|---|---|---|
| `identity` | name · role · final decision maker? | every survey |
| `core` | the 10 shared brand-essential questions | branding, website, both |
| `branding` | 11 branding-specific questions | branding, both |
| `website` | 15 website questions | website, both |
| `ecommerce` | 9 questions, conditional | website, both — only when selling online |
| `content` | 12 questions | the follow-up content survey only |

**Consequence:** a "Branding + Website" client answers `core` **once**, not twice. Under the old Google Forms they either answered it twice or the team dropped one form and lost stakeholder coverage.

**Consequence:** editing "Who is your target audience?" once updates every questionnaire that uses it.

## Bugs in the original Google Form, already fixed in the seed
1. **Duplicate question** — the website section asked for desired features twice in a row. Removed.
2. **Missing personality pair** — the instruction said "10 pairs" but only nine were listed. *Realistic – Idealistic* restored, so website and branding projects compare on the same ten scales.
3. **Question asked twice across sections** — sample product information appeared in both the website and e-commerce sections. Now asked once.
4. **No stakeholder identity** — the form collected email only. The `identity` block adds name, role and decision-maker status, without which conflict weighting has nothing to run on.

## Ordering
The website block is deliberately ordered so the feasibility inputs come first: goal, budget, launch date, page count, languages, features. Clients answer budget more honestly before describing everything they want, and the feasibility check needs all six.

## Question types — exactly five
`paragraph` · `short_text` · `multiple_choice` · `checkboxes` (optional min/max) · `linear_scale` (pole labels + point count).

These are the five the original Google Forms used. Do not add a sixth without a product reason.

## Conditional blocks
`ecommerce` is shown only when the website block's goal is "Sell products online" or its feature list includes "Online shop and checkout". The trigger is declared in the seed file.

## Fields the analysis needs
Several questions carry `maps_to` in the seed — `decision_maker`, `pages`, `languages`, `skus`. These populate project fields used by the feasibility check and the content survey. Keep the mapping when importing.
