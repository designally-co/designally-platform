# Building it — the first session with Claude Code

**Designally Platform · August 2026**

> **Where this is out of date, 11 August 2026.** Milestones 1, 2 and 3 are built and deployed.
> Milestone 5 is retired with the website track. The questionnaire this plan describes is
> version 1; the branding team replaced it, and `docs/questionnaire-architecture.md` has the
> current structure. The milestone prompts are kept because the *habits* section above them is
> the useful part, not the wording of any single prompt.

---

## Are you ready?

Almost. Here is the honest state.

**Decided and written down** — the product, the users, the whole flow, what the analysis produces, the questionnaire structure, the navigation, and a complete design system. All of it argued out and recorded. That is far more than most builds start with, and it is the part that usually goes wrong.

**Not decided yet — four things.** None takes long, but the first session needs three of them.

| Decision | Recommendation | Why |
|---|---|---|
| Database host | **Neon** Postgres | Cleanest with Vercel and Drizzle, which you already use. Supabase is fine too if you want auth bundled. |
| Team login | **Google OAuth restricted to designally.co** | You are already on Google Workspace. Nobody manages another password, and access dies with the account. |
| Survey link domain | A subdomain — `s.designally.co` or a path on the main app | Client links must be short, public and obviously yours. Decide before milestone 1 so tokens don't need migrating. **Settled: the subdomain.** |
| Anthropic API key | An account with billing, key in Vercel env | Not needed until milestone 3. Cents per brief at your volume. |

**One housekeeping step.** Copy the docs out of the Claude Project into the repo. Claude Code cannot see the Project — only files on disk.

```
designally-platform/
  CLAUDE.md
  PRODUCT.md
  DESIGN.md
  docs/
    complete-flow.md
    insight-engine-spec.md
    questionnaire-architecture.md
    team-workflow-after-survey.md
    navigation-decisions.md
  reference/
    designally-app.html      ← the prototype. Copy, do not regenerate.
    brief-one-page.html
    flow-map.html
```

---

## How to brief it

Three habits matter more than the wording of any single prompt.

**Point at the docs instead of re-explaining.** You have spent a long time deciding things. Say "per `docs/complete-flow.md`" rather than describing the flow again — it reads the file, and it stays consistent between sessions in a way your memory won't.

**Say what "done" means.** End every prompt with a test you can personally run. Not "make it work" but "I can open this on my phone, answer in Thai, close the tab, reopen, and my answers are still there." That sentence is what turns a demo into working software.

**Never let it invent product behaviour.** If it proposes something not in the docs, that is a signal one of two things is true: the docs are missing something, or it is guessing. Both are worth stopping for. When you decide something new, tell it to write the decision into `docs/` in the same commit.

---

## Session one — setup

Full step-by-step, including installing Node, is in `SETUP.md`. The short version:

```bash
cd ~/Documents
npx create-next-app@latest designally-platform --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd designally-platform
cp -R ~/Downloads/designally-platform/. .     # the starter files go in AFTER
git init && git add . && git commit -m "Starter"
claude
```

The app is created in an empty folder first — `create-next-app` refuses to run where files already exist.

Then open with this:

> Read CLAUDE.md, PRODUCT.md and DESIGN.md before doing anything. Then read docs/complete-flow.md and docs/questionnaire-architecture.md.
>
> Don't write code yet. Tell me in your own words: what this product does, what the human gates are, and why the project table has no star. If any of that is unclear from the docs, say which file is missing it.

You are testing whether the context landed. If it gets the gates right, the rest of the build will go well. If it doesn't, fix the docs before writing a line of code.

---

## The milestone prompts

Copy these as-is. Run each to completion and use it before starting the next.

> **These are the prompts as they were written, kept unedited.** Three things in them are no
> longer true, and the record of what was asked for is worth more than a tidy document:
> milestone 2's stage timeline and stage flow, and milestone 4's deck panel and recorded
> decisions, all went on 17 August 2026 with the kick-off — the platform's job now ends at the
> confirmed insights. Milestone 4 is the confirm gate and nothing else. What each milestone
> means today is in `CLAUDE.md`.

### Milestone 1 — one survey link that works

> Build milestone 1 from CLAUDE.md.
>
> Scope:
> - Public route `/s/[token]`, no auth
> - Drizzle schema + migration for: clients, projects, question_blocks, questions, surveys, responses, answers — as specified in CLAUDE.md
> - Seed the questionnaire from docs/questionnaire-architecture.md. Question types: paragraph, short_text, multiple_choice, checkboxes with optional min/max, linear_scale with pole labels and point count
> - Render it in the five steps used in reference/designally-app.html, with the same copy in English and Thai
> - Save progress as the respondent moves between steps, keyed to the token in localStorage plus a server draft
> - On submit, write one response row and its answer rows
>
> Port the markup and styling from reference/designally-app.html. Do not redesign it. Follow DESIGN.md for anything not covered there.
>
> Done when: I open the link on my phone, answer in Thai, close the tab, reopen it, find my answers still there, submit, and see the rows in the database.

### Milestone 2 — the team can see it

> Build milestone 2.
>
> - Google OAuth restricted to the designally.co domain
> - The landing page exactly as specified in DESIGN.md section 6: Needs you card, the All projects table, the three destinations at the foot
> - New survey form: client + project code, package picker, generates a token and a link. No expected respondent count — read rule 3 in CLAUDE.md
> - The project detail panel: right now, stage timeline, who answered, documents, archive
> - Manual archive only. No timers anywhere in this codebase
>
> The stage flow follows the package. Never hard-code the number of stages.
>
> Done when: I create a survey for a real client, send the link, watch answers arrive in the table, open the project, and archive it when I choose to.

At this point stop and use it on a live project. It already replaces Google Forms.

### Milestone 3 — the brief writes itself

> Build milestone 3.
>
> - "Close and analyse" on any open survey — records closed_at and closed_by
> - Server-side call to the Anthropic API that produces the brief specified in docs/insight-engine-spec.md
> - Structure it exactly as reference/brief-one-page.html: read this first, settled, unsettled with severity, not decided yet, for the creative team, signals, collapsed detail, deck outline, internal notes
> - Store the brief as structured data, not a blob of markdown
> - Never generate percentages, sentiment scores or estimated volumes. Read the "never generate" section of the spec
>
> Test it against the real ARUN+ data — 28 responses, 6 departments — and the PCE-TH data. I know what good output looks like for both, so show me the result before we call this done.
>
> Done when: the brief it writes for ARUN+ finds the B2B/B2C split, the mutual-avoid tone contradiction, and the clarity gaps — without me prompting for them.

This is the milestone that will take longest, and the time will go on tuning the prompt rather than the code. Expect that.

### Milestone 4 — the gates

> Build milestone 4.
>
> - Review and confirm the brief, recording confirmed_at and confirmed_by
> - "Send to Claude" panel with the copyable deck brief, per docs/team-workflow-after-survey.md
> - Record decisions: each conflict the brief found, the options the deck presented, a free-text note, and "still open" as a valid outcome
> - Recorded decisions appear in the project detail and are the brief the design work runs on
>
> Nothing reaches a client before a human confirms. Enforce it in the data layer, not just the UI.

### ~~Milestone 5 — the website track~~

**Retired 11 August 2026.** The website and combined packages were dropped, and the content survey
went with them. Rule 4 survives on its own merits — the platform still never displays a predicted
quantity of work.

### ~~Milestone 6 — the template editor~~

**Retired 17 August 2026, with the *Question templates* panel.** The questionnaire is fixed at
version 5 and the branding team owns its wording; an editor for it is a surface to maintain and
the easiest way to break rule 5. Kept below because the versioning requirement in it is still the
rule, whoever ends up editing a question and however they do it.

> Build milestone 6.
>
> Editing questions in the app: bilingual text, the five answer types, per-type settings — choice editor with add and remove, min/max for checkboxes, pole labels and point count for linear scale.
>
> Questions are versioned. A survey already sent keeps the version it was sent with. Prove this with a test: send a survey, edit the template, confirm the sent survey is unchanged.

---

## When it goes wrong

**It redesigned something.** "That doesn't match reference/designally-app.html. Port the original markup and styling instead of writing new."

**It added a helpful automation.** "Rule 1 in CLAUDE.md — nothing happens on a timer. Remove it and surface a prompt instead."

**It looks wrong but you can't say why.** "Run the checklist at the end of DESIGN.md against this screen and tell me what fails." It is usually spacing off the scale, or a second colour inside a line.

**Thai is broken.** "Line-height is below 1.6 on a line containing Thai. Fix it and screenshot the result." Check this on every screen. It is the defect you will hit most.

**It says something works.** "Run it, screenshot it, and show me." It can, so make it.

---

## What to expect

Milestone 1 in a session or two. Milestone 2 within the first week — and that is the point where it replaces Google Forms and starts paying for itself. Milestone 3 is the one to be patient with; the code is straightforward and the prompt tuning is not.

The real risk is not that the code fails. It is building every milestone before using any of them, then discovering the summary doesn't say what your designers need. Use each one on a real client before starting the next.

That risk is what two of the six milestones were eventually cut by. Milestone 5 went when the
package it served did; milestones 4 and 6 shrank on 17 August 2026 when the team looked at what
they actually opened. Both cuts came from use, not from planning, which is the argument for the
order.

---

*Prepared for Designally — August 2026*
