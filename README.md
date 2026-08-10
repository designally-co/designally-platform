# Designally Platform

Internal tool replacing the manual work between a signed deal and a kick-off meeting.
Clients answer branded bilingual questionnaires; the platform collects however many
responses arrive, finds where stakeholders disagree, and produces one confirmed page
that drives the kick-off.

## Read these first, in this order

1. **`PRODUCT.md`** — who it is for, what it does, the design principles
2. **`DESIGN.md`** — the complete design system, derived from Apple's
3. **`CLAUDE.md`** — stack, rules that must not be broken, data model, milestones
4. **`docs/first-session-brief.md`** — the build plan with copy-paste prompts

## What is already decided

| | |
|---|---|
| Stack | Next.js 14 App Router · TypeScript · Tailwind · Drizzle |
| Database | Supabase Postgres |
| Login | Google OAuth, designally.co only |
| Survey links | `designally.co/s/<token>` and `/c/<token>` |
| Hosting | Vercel |
| Analysis | Anthropic API, server-side |

## What is not decided

- Whether the main site can route `/s/*` and `/c/*` to the platform. **Check this before milestone 1** — it affects how tokens are issued.
- Anthropic API account and key. Not needed until milestone 3.

## Repository contents

```
CLAUDE.md                    instructions Claude Code reads every session
PRODUCT.md                   product context
DESIGN.md                    the design system
docs/
  first-session-brief.md     build plan and milestone prompts
  complete-flow.md           every step, and who owns it
  insight-engine-spec.md     what the analysis produces — and never produces
  questionnaire-architecture.md  shared question blocks, not separate templates
  website-questionnaire-v2.md    the revised website questionnaire
  content-survey.md          the follow-up survey and when it is sent
  team-workflow-after-survey.md  what the team does after answers arrive
  navigation-decisions.md    why the navigation is what it is
reference/
  designally-app.html        the working prototype — port from this, don't redesign
  brief-one-page.html        the brief format, built from real ARUN+ data
  flow-map.html              the flow as a diagram
seed/
  question-blocks.json       60 questions, bilingual, ready to import
```

## The eight rules

These are product decisions, not preferences.

1. Nothing happens on a timer — no auto-close, no auto-archive
2. Four human gates, each recording who acted: close · confirm · record decisions · archive
3. No expected respondent count, ever. "3 answers so far", never "2 of 4"
4. No estimated content volume, client-facing or internal
5. Questions are versioned — a sent survey keeps the version it was sent with
6. Nothing reaches a client before a human confirms
7. No percentages or sentiment scores — "2 of 3" is honest
8. Internal facilitation notes never render on a client-facing surface

## Running it

```bash
npm install && npm run db:migrate && npm run db:seed && npm run dev
```

The seed prints a survey link — open it, or find it listed on `/`.

| Command | |
|---|---|
| `npm run dev` | the app on http://localhost:3000 |
| `npm run db:migrate` | apply `drizzle/*.sql` |
| `npm run db:seed` | import `seed/question-blocks.json`, create an example survey |
| `npm run db:inspect` | print what a survey has collected |
| `npm run db:reset` | throw the local database away and rebuild it |
| `npm run db:generate` | regenerate SQL after a schema change |

**The database.** With `DATABASE_URL` set, everything runs on Supabase Postgres through postgres-js — that is what Vercel runs. Without it, the app falls back to [PGlite](https://pglite.dev), real Postgres compiled to WASM, kept in `.pglite/`. Same schema, same migrations, no credentials needed to work on the survey.

Two things to know about the local fallback. It takes **one process at a time**, so stop the dev server before `db:inspect` or `db:seed`. And it is **disposable**: `Ctrl+C` shuts it down cleanly, but a hard kill leaves an unrecoverable checkpoint — run `npm run db:reset` and carry on.

## Where the build has got to

**Milestone 1 is done.** A public bilingual questionnaire at `/s/<token>`, saving to Postgres. No auth, no team app — milestone 2 brings those.

- All six question blocks seeded from `seed/question-blocks.json` — 60 questions, versioned
- The branding questionnaire in the five steps from `reference/designally-app.html`
- All five question types, including the ten personality scales and the 6–10 word chips
- Progress saved to localStorage **and** a server draft, so a cleared browser or a second device still picks up where it left off
- One response row and its answer rows on submit; a blank answer is stored as absent, which is what the analysis reads as a clarity gap

## First move

**Read `SETUP.md`.** It walks through installing Node, creating the Next.js app, adding these files
and starting Claude Code, in the order that actually works.

The short version — note that the app is created **first**, in an empty folder, and these files are
copied in **afterwards**. `create-next-app` refuses to run in a folder that already has files.

```bash
cd ~/Documents
npx create-next-app@latest designally-platform --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd designally-platform
cp -R ~/Downloads/designally-platform/. .
git init && git add . && git commit -m "Starter"
claude
```

Then paste the readiness check from `docs/first-session-brief.md` before asking for any code.
