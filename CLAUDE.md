# Designally Platform — Claude Code Instructions

## Project

Internal platform replacing the manual work between a signed deal and the start of the work. Clients answer branded bilingual questionnaires; the platform collects responses, finds where stakeholders disagree, and produces one confirmed summary. That summary is the end of the job — what the team does with it afterwards is not the platform's business.

Read `PRODUCT.md` for users, purpose and design principles. Read `DESIGN.md` for the visual system. Both take precedence over anything inferred from existing code.

## Tech Stack

- Next.js 14+ (App Router), TypeScript, `src/` directory
- Tailwind CSS
- Drizzle ORM + **Neon Postgres**
- **Google OAuth, restricted to the designally.co domain** — no other sign-in method
- Vercel deployment
- Anthropic API for analysis (server-side only, never exposed to the client)

**Survey links live at `s.designally.co/s/<token>`.**

**Decided 10 August 2026 — a subdomain, not a path on the main site.** The original plan was
`designally.co/s/<token>`, routed from the main site. The main site turned out to run on
WordPress, which makes that the wrong shape:

- It needs **two** prefixes proxied, not one. The survey saves drafts to `/api/s/<token>/draft`
  as the client types. Proxy `/s/*` and forget `/api/s/*` and the questionnaire looks fine while
  silently saving nothing.
- `mod_proxy` is disabled on most shared hosting and blocked by most managed WordPress hosts.
- It puts a PHP stack in the path of a twenty-minute questionnaire answered on a phone on a poor
  connection. Every timeout and buffering quirk lands on the client, who does not report it —
  they simply stop answering.
- A plugin update or host migration can change rewrite behaviour with nobody watching.

`s.designally.co` is a CNAME to Vercel. WordPress is never in the path, and Vercel issues the
certificate. `docs/first-session-brief.md` listed this option first.

The host is never hardcoded. `SURVEY_ORIGIN` sets it, and with it unset the app uses whatever host
is serving it, so the link the team copies is always a link that resolves. Changing domain later
is an environment variable — tokens are stored on their own and keep working.

The database host supplies a connection string and nothing else. Auth is Google OAuth in the
Next.js app — one identity source, and it dies with the Workspace account. No hosted-auth,
storage or client library from the database vendor; the app talks to it through `postgres-js`
against `DATABASE_URL`, so the host is a one-line change.

**Decided 10 August 2026 — Neon, not Supabase.** Two reasons, in order of weight:

1. **A free Supabase project pauses after 7 quiet days and has to be restored by hand.** This
   product's rhythm is sporadic — a client opens their questionnaire a week or two after it is
   sent. A paused database means a dead link, and the client does not report it as broken, they
   simply never answer. Neon suspends the same way but resumes on the next connection in a
   fraction of a second, so nobody sees it.
2. Supabase's free plan allows two projects per account, and both were already in use.

`docs/first-session-brief.md` recommended Neon at the outset for a third reason — it is the
cleanest fit with Vercel and Drizzle. Nothing about the schema, the migrations or the driver
changes; only `DATABASE_URL`.

**Do not import theme, tokens, or components from Knowledge Hub or Content Generator.** Those projects share the stack but not the design system, and neither has a settled one. This project defines its own in `DESIGN.md` and is the reference going forward.

## Two surfaces, one app

- **Public** (`/s/[token]`) — client surveys. No login. Must work on a phone, in Thai, on a poor connection. Saves progress as the client goes.
  **Two to four questions per screen**, grouped by subject in `src/lib/survey/steps.ts` —
  the step *is* the screen, and it **shows all of them and opens one**. The rest fold to
  their number, their question, and once answered the client's own words; tapping one opens
  it. Enter goes to the next question and only leaves the screen when none is left. Asked for by the branding team 17 August 2026; it was one
  question per screen before. Group by what somebody answers in one breath, never by
  count, and the heading over a screen has to be true of everything under it. The
  masthead counts screens and does not count the name/position/email screen — the
  count starts at the first question and its Cut is at rest there. Each question
  keeps its own 1–21 number in the data — the send screen's grid, the team's
  reading and the analysis all use it — but it is not printed on the card.
- **Private** (everything else) — the team app. Behind auth. Designally staff only.

Keep them in one Next.js app. Do not build two projects.

## Specs

Everything is decided already. Do not invent product behaviour — read these first:

```
docs/complete-flow.md              the whole flow, step by step, who does what
docs/first-session-brief.md        the build plan and milestone prompts
docs/insight-engine-spec.md        what the analysis produces, and what it must never produce
docs/questionnaire-architecture.md block structure — shared questions, not separate templates
docs/team-workflow-after-survey.md what the team does after answers arrive
docs/navigation-decisions.md       why the navigation is what it is
reference/designally-app.html      the working prototype — design system, copy, interactions
reference/brief-one-page.html      the brief format, built from real ARUN+ data
reference/flow-map.html            the flow as a diagram
```

`docs/website-questionnaire-v2.md` and `docs/content-survey.md` were deleted on 11 August 2026
with the website track. `reference/flow-map.html` still draws the old branch after the kick-off.

**The prototype is the source of truth for design and copy.** It holds the bilingual strings, the token values, the interaction decisions, and the tone. Port from it. Never regenerate a screen from scratch when it already exists there.

## Design

`DESIGN.md` is the complete system — colour, type, Thai typography rules, spacing, every component spec, and the anti-patterns list. Read it before building any screen. Do not infer visual decisions from other repos.

**The brand is the Designally CI, adopted 14 August 2026** from the branding team's design
system (`claude.ai/design`, "Designally Design System"). Colour, the three typefaces, the
five named brand pieces and the voice come from there. The structure underneath does not:
the parchment inversion, the accent rule, borders-not-shadows, the Thai leading rule and
the two volumes are this product's own and survived unchanged. The CI calls itself *a
container, not a look*, and its mood is "expansive, intelligent, timeless" — there was no
conflict with the minimalism already here.

Three things to know before touching colour or type:

- **Shape is not the CI's.** It sets card and control radius to 2px; this product keeps the
  pill primary and the disc back control, because the survey is answered one card at a
  time on a phone. Deliberate, and recorded at the radii tokens.
- **`#ef6148` cannot do functional work on the CI's own page.** 2.92:1 on warm white, so it
  cannot draw a boundary, a dot or text; 3.24:1 under white, so it cannot carry a button
  label. The action colour is the CI hue at the lightness where a white label clears
  4.5:1 — `#c73f29`. The pure CI orange keeps the Cut and the dark Field, where it
  measures 5.99 and is free to be itself.
- **Five CI values fail their own contrast and are corrected here**, hue and chroma held,
  lightness moved. All are marked `CI-DIVERGENCE` in `globals.css` and tabulated in
  `DESIGN.md` §1. Worth sending back to the branding team. The worst is the focus ring on
  the dark Field at 1.39:1. Zalando Sans also does not cover Thai, though the readme says
  it does.

Three things from it that are easy to get wrong:

- **The accent means "a person is needed here."** Never decorative. Accent on something nobody must act on is a defect.
- **Thai leading: 1.6 in a paragraph, 1.25 on a line that stands alone.** Thai stacks four levels vertically and Latin-tuned values clip tone marks — but the flat 1.6 condemned `body` itself and so caught nothing. Measure the ink; see `DESIGN.md` §2.
- **Borders, not shadows.** The focus ring is the only shadow in the system.

## One word, one thing

**Insights** are what the analysis produces from the answers — conflicts, clarity
gaps, flags. It is the only artefact the platform makes, and the job ends when a
person confirms it.

There was a second — **the brief**, what the designer was handed after the
kick-off decisions were recorded. Both were called "brief" until 13 August 2026,
which meant the button said one thing, the sheet title said "survey analysis",
and the spec said "insight". Splitting the words is what let the second object be
seen at all — and then seen for what it was, and dropped with the kick-off on
17 August. The vocabulary work outlived the thing it was for: the surface is
called the insights everywhere, and nothing here is called a brief.

The SQL table was renamed to `insights` on 14 August 2026, which needed
`drizzle-kit generate` run interactively — it has to be told the difference
between a rename and dropping a table with real analyses in it.

The CSS class prefix went the same way on 14 August: `.bsec`, `.bsechead` and
`.bversions` were "brief section" and "brief versions", the retired word sitting
in the stylesheet of the sheet that renamed itself. They are `.isec`,
`.isechead` and `.iversions`. `reference/brief-one-page.html` keeps its name —
it predates the split, and what it draws is this surface, not the brief.

## Rules that must not be broken

These are product decisions, not preferences. If a request conflicts with one, say so before building it.

1. **Nothing happens on a timer.** The app never closes a survey, confirms a brief, or archives a project by itself. It may surface a prompt; a person acts.
   A survey carries a **due date** — chosen on the New survey sheet, prefilled at 14
   days and editable afterwards on the project — and
   that is a date, not a deadline the software enforces. The client is shown it, and once
   it passes the project appears in Needs you asking whether to close. Answers arriving
   after it are accepted. Asked for 14 August 2026; built this way rather than as an
   auto-close, which would have left `closed_by` empty.
2. **Three human gates, each recording who acted:** close collection · confirm the insights · archive the project. Store `*_by` and `*_at` on every one. There was a fourth — recording the kick-off decisions — retired 17 August 2026 with the kick-off itself; it was never built.
3. **No expected respondent count.** Collection is open-ended. Never show a fraction like "2 of 4". Show "3 answers so far · last one 2 days ago".
4. **No estimated content volume.** Do not calculate or display a predicted piece count anywhere, client-facing or internal. The earlier figure came from one project and is not reliable.
5. **Questions are versioned.** A sent survey keeps the question version it was sent with. Editing a template affects future surveys only.
6. **Nothing reaches a client before a human confirms it.**
7. **The analysis never produces percentages or sentiment scores.** Three to twenty respondents cannot support them. "2 of 3" is honest.
8. **Internal facilitation notes are never rendered on a client-facing surface.** Keep them in a separate field, not a flag on shared content.

## Data model

Seed data for every question block — bilingual, with per-type config — is in `seed/question-blocks.json`.
Do not retype the questions; import that file.

```
clients          name, project_code
projects         client_id, package, archived, archived_at/by
                 stage, kickoff_at — retired 17 August 2026 with the kick-off
                 pages, languages[] — unused since v2
                 all four retired in place: never written, never read
question_blocks  key (identity | strategy | project | visual
                      | core | branding | website | content | ecommerce — retired)
questions        block_id, order, text_en, text_th, type, config, version
surveys          project_id, kind (discovery), token,
                 opened_at, due_at, closed_at, closed_by
                 due_at — the date the team told the client to answer by. It
                 shows on the survey and raises a prompt on the landing page
                 when it passes. It closes nothing (rule 1).
responses        survey_id, respondent_name, role, email, submitted_at
                 role and email — retired at versions 3 and 4, both live again at
                 question version 5: the team asked for who is speaking and how to
                 reach them before they read an answer. Neither column was ever
                 dropped, so bringing the questions back needed no migration.
                 decision_maker — retired at question version 3, kept for surveys
                 sent before it
answers          response_id, question_id, value
insights         project_id, generated_at, content, sources,
                 confirmed_at, confirmed_by   (table renamed from briefs, 14 Aug)
decisions        retired 17 August 2026 with the kick-off — table kept, empty
users            team members
```

Question types are exactly five: `paragraph`, `short_text`, `multiple_choice`, `checkboxes` (with
optional min/max), `linear_scale` (with pole labels, point count, and an optional `start`). The personality scales
run **1–5**. Version 2 briefly ran them 0–10; `start` and the wide rendering stay for the surveys
sent while that was true.

**Decided 11 August 2026 — two packages, and the website track is retired.** The branding team
replaced the questionnaire. A client buys Brand **or** Design, never both.

| Package | Blocks | Questions |
|---|---|---|
| **Brand** — Brand Strategy + Brand Identity | identity · strategy · visual | 22 |
| **Design** | identity · project · visual | 12 |

Part 2 of the new questionnaire is identical in both packages, word for word, in both languages —
so `visual` is one shared block. See `docs/questionnaire-architecture.md`.

Gone with the website track: the `website`, `both` and `content` packages, the content survey and
its `/c/<token>` route, and **milestone 5**. The retired blocks stay in the database because
surveys already sent keep the questions they were sent with (rule 5); deleting a block key would
orphan a real brief.

**There are no stages.** The five-stage meter — Lead → Proposal → Survey → Analysis → Kick-off —
went on 17 August 2026, along with the kick-off, the *What's coming* sheet and the question
template panel. The app models a survey and the summary it produces, and nothing on either side
of that. `projects.stage`, `projects.kickoff_at` and the whole `decisions` table are retired in
place: never written, never read, never dropped.

## Build milestones

Each one ends with something usable. Do not start the next before the previous has been used on a real project.

1. **One survey link that works** — public bilingual form, saves to Postgres. No auth, no team app.
2. **The team can see it** — auth, Projects list, create survey, view responses. Already replaces Google Forms.
3. **The team can prepare in ten minutes** — close and analyse, Anthropic API, structured output. The engine reports what they might miss or must be careful about; it does not read the answers for them. The team sees the full answers and that summary. Narrowed 13 August 2026 after the first real brief returned fifty items, and again on 17 August when the deck outline and the room notes went with the kick-off — see `docs/insight-engine-spec.md`.
4. **The human gate** — review and confirm the insights. That is where the platform stops.
5. ~~The website track~~ — retired 11 August 2026 with the website package.
6. ~~The template editor~~ — retired 17 August 2026 with the *Question templates* panel. The
   questionnaire is fixed at version 5, the branding team owns its wording, and the questions
   live in `seed/question-blocks.json`. Rule 5 still holds if that ever changes.

## Working conventions

- Commit after each working piece. Small commits, plain messages.
- **Test in Thai every time.** Thai wraps and stacks differently; layouts that pass in English fail in Thai. This is the most common defect in this domain.
- Test client surveys at 390px width before considering them done.
- Run the app and screenshot it rather than asserting that something works.
- When a product decision changes, update the file in `docs/` in the same commit.
- Run through the checklist at the end of `DESIGN.md` before calling a screen finished.

## Figma

MCP server connected (`claude mcp add --transport http figma https://mcp.figma.com/mcp`).

This project's design system is defined in code first, not in Figma. Build the screen, then use code-to-Figma capture to bring it back for review or to hand to a designer. Do not start from a Figma frame that predates `DESIGN.md` — the tokens here are the source of truth.

If a component library is later built in Figma, generate it *from* this system rather than the reverse.
