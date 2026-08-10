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
