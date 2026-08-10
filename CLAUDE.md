# Designally Platform — Claude Code Instructions

## Project

Internal platform replacing the manual work between a signed deal and a kick-off meeting. Clients answer branded bilingual questionnaires; the platform collects responses, finds where stakeholders disagree, and produces one confirmed page that drives the kick-off. Website projects continue with a second survey covering content ownership.

Read `PRODUCT.md` for users, purpose and design principles. Read `DESIGN.md` for the visual system. Both take precedence over anything inferred from existing code.

## Tech Stack

- Next.js 14+ (App Router), TypeScript, `src/` directory
- Tailwind CSS
- Drizzle ORM + **Neon Postgres**
- **Google OAuth, restricted to the designally.co domain** — no other sign-in method
- Vercel deployment
- Anthropic API for analysis (server-side only, never exposed to the client)

**Survey links live at `s.designally.co/s/<token>`** and the content survey at `s.designally.co/c/<token>`.

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

- **Public** (`/s/[token]`, `/c/[token]`) — client surveys. No login. Must work on a phone, in Thai, on a poor connection. Saves progress as the client goes.
- **Private** (everything else) — the team app. Behind auth. Designally staff only.

Keep them in one Next.js app. Do not build two projects.

## Specs

Everything is decided already. Do not invent product behaviour — read these first:

```
docs/complete-flow.md              the whole flow, step by step, who does what
docs/first-session-brief.md        the build plan and milestone prompts
docs/insight-engine-spec.md        what the analysis produces, and what it must never produce
docs/questionnaire-architecture.md block structure — shared questions, not separate templates
docs/website-questionnaire-v2.md   the revised website questionnaire, bilingual
docs/content-survey.md             the follow-up survey and when it is sent
docs/team-workflow-after-survey.md what the team does after answers arrive
docs/navigation-decisions.md       why the navigation is what it is
reference/designally-app.html      the working prototype — design system, copy, interactions
reference/brief-one-page.html      the brief format, built from real ARUN+ data
reference/flow-map.html            the flow as a diagram
```

**The prototype is the source of truth for design and copy.** It holds the bilingual strings, the token values, the interaction decisions, and the tone. Port from it. Never regenerate a screen from scratch when it already exists there.

## Design

`DESIGN.md` is the complete system — colour, type, Thai typography rules, spacing, every component spec, and the anti-patterns list. Read it before building any screen. Do not infer visual decisions from other repos.

Three things from it that are easy to get wrong:

- **The accent means "a person is needed here."** Never decorative. Accent on something nobody must act on is a defect.
- **Thai line-height is never below 1.6.** Thai stacks four levels vertically; Latin-tuned values clip tone marks.
- **Borders, not shadows.** The focus ring is the only shadow in the system.

## Rules that must not be broken

These are product decisions, not preferences. If a request conflicts with one, say so before building it.

1. **Nothing happens on a timer.** The app never closes a survey, confirms a brief, or archives a project by itself. It may surface a prompt; a person acts.
2. **Four human gates, each recording who acted:** close collection · confirm the brief · record the kick-off decisions · archive the project. Store `*_by` and `*_at` on every one.
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
projects         client_id, package, stage, archived, archived_at/by,
                 kickoff_at, pages, languages[]
question_blocks  key (identity | core | branding | website | content | ecommerce)
questions        block_id, order, text_en, text_th, type, config, version
surveys          project_id, kind (discovery | content), token,
                 opened_at, closed_at, closed_by
responses        survey_id, respondent_name, role, decision_maker, email, submitted_at
answers          response_id, question_id, value
briefs           project_id, generated_at, content, confirmed_at, confirmed_by
decisions        project_id, question, outcome, note, recorded_at, recorded_by
users            team members
```

Question types are exactly five, matching the current Google Forms: `paragraph`, `short_text`, `multiple_choice`, `checkboxes` (with optional min/max), `linear_scale` (with pole labels and point count).

Stage flow differs by package — branding runs 5 stages, website and combined run 7:
```
branding  Lead → Proposal → Survey → Analysis → Kick-off
website   Lead → Proposal → Survey → Analysis → Kick-off → Content → Build
```

## Build milestones

Each one ends with something usable. Do not start the next before the previous has been used on a real project.

1. **One survey link that works** — public bilingual form, saves to Postgres. No auth, no team app.
2. **The team can see it** — auth, Projects list, create survey, view responses. Already replaces Google Forms.
3. **The brief writes itself** — close and analyse, Anthropic API, structured output. Test against the real ARUN+ (28 responses) and PCE-TH data.
4. **The human gate and the decisions** — review, confirm, deck handoff, record decisions.
5. **The website track** — content survey after decisions are recorded.
6. **The template editor** — until then, questions live in a seed file.

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
