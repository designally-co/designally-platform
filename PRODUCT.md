# Product

<!-- impeccable:product-schema 1 -->

## Register

product

## Platform

web

## Users

Two audiences with opposite needs.

**Designally's project team** — the people who run client projects: sending questionnaires, reading what came back, preparing for the first working meeting, and keeping several clients moving at once. They open this tool between other work, often for fifteen seconds, and need to know immediately whether anything is waiting on them. They are not looking for a dashboard to study; they are looking for an answer to "is there anything I have to do".

**The client's stakeholders** — founders, marketing leads, operations managers at the client company, answering a questionnaire once. Most are answering on a phone, in Thai, without much context about why they were sent the link.

**Usually one person from the client company answers. Sometimes two or three do.** Confirmed 13 August 2026, and it revises an earlier assumption that several stakeholders would answer every survey. The link is still shareable and collection is still open-ended — the platform never asks how many people to expect — but a survey with one respondent is the normal case, not the degenerate one.

## Product Purpose

Designally Platform replaces the manual work between a signed deal and the start of the work. Clients answer a branded bilingual questionnaire; the platform collects however many responses arrive and writes one page that says what the client has settled, where they contradict themselves or each other, and what they have not decided yet. A person on the team confirms that page before anything goes further.

**The analysis's first job is to turn twenty-one long answers into a page somebody can act on.** Most of that work is reading one person carefully: finding the gap between what they say they want and what they say they admire, noticing which questions they could not answer, and separating what is settled from what is still open in their own head.

**When more than one person answers, disagreement between them is the most valuable thing in the data** — the team meets it on the first day rather than in revision round three. That case is the exception rather than the rule, and the insights must be worth reading when it does not occur.

## Positioning

An internal tool that turns scattered stakeholder answers into one confirmed page of decisions, and keeps every live client project visible in a single list.

## Operating Context

A project runs from a signed deal to a confirmed summary.

1. The team creates a survey and copies the link. **Sending it is manual** — there is no email from the platform, ever. The survey carries a date to answer by, two weeks out by default.
2. The client answers, on a phone, usually in Thai, often a week or two after the link was sent.
3. The team closes collection and the analysis writes the insights.
4. The team reads and confirms the insights. **This is where the platform's job ends.**
5. The project is archived by hand, whenever the team judges it finished.

**Three human gates, each recording who acted and when:** close collection · confirm the insights · archive the project. None of them can happen on a timer, including the date in step 1 — it raises a prompt and closes nothing.

**Narrowed 17 August 2026.** There were two more steps and a fourth gate: copy the confirmed
text into Claude to build a kick-off deck, run the kick-off, and record what was decided. The
platform now stops at the summary. Everything downstream of it — the deck, the meeting, the
record of what the room settled — is the team's, done in the team's own tools. The engine's
deck outline and its notes on running the room went at the same time, and so did the
five-stage meter.

Two packages, and a client buys one or the other, never both — **Brand** (Brand Strategy + Brand Identity, 21 numbered questions) and **Design** (11). There are no stages; a project is collecting answers, or it has a summary.

The website track and its follow-up content survey were retired on 11 August 2026 and no longer form part of the flow.

## Capabilities and Constraints

- **Questions are versioned.** A survey freezes the question version it was sent with, so editing a template only affects future surveys. Retired question versions and block keys stay in the database for as long as a survey references them.
- **There is no expected respondent count.** Collection is open-ended and the interface never shows a fraction like "2 of 4".
- **No percentages, sentiment scores, or estimated volumes** anywhere, client-facing or internal. Three to twenty respondents cannot support them; "2 of 3" is honest.
- **Nothing reaches a client before a human confirms it.**
- **Internal facilitation notes never render on a client-facing surface**, and live in their own field rather than behind a flag.
- **The client's contact email never goes to the analysis API.** It is contact detail, not evidence, and it is the only field that identifies a real person off this system.
- The survey must work on a phone, in Thai, on a poor connection, and save progress as the client goes.
- **Questions live in a seed file, and that is now the settled answer.** The questionnaire is fixed at version 5, the branding team owns its wording, and changing one needs a developer and a deploy. The in-app template editor was retired on 17 August 2026 — an editor for something nobody edits is a surface to maintain and the easiest way to break the versioning rule above.

## Brand Commitments

The product is Designally's own, and the client-facing questionnaire is for many stakeholders their first real experience of the agency. Survey links live at `s.designally.co`, short and obviously Designally's. Team access is Google OAuth restricted to the designally.co Workspace — access dies with the account, and there is no other sign-in.

## Evidence on Hand

**Real client data exists and is not in this repository.** The ARUN+ survey (28 responses across 6 departments) and the PCE-TH data are held in Google Drive and are the acceptance test for the analysis: the insights must find the B2B/B2C audience split, the mutual-avoid tone contradiction and the clarity gaps without being prompted for them. Both were collected under question version 1, which recorded each respondent's department and decision-maker status — signals the current questionnaire no longer collects.

`scripts/dev-fixture.ts` writes five synthetic respondents carrying deliberately planted findings, and `npm run dev:analyse` runs the real prompt against them. That is a test, not evidence about a real client.

**There are no testimonials, case studies, benchmarks, press mentions, pricing or customer counts.** Future work must not invent them, and must not present the fixture's synthetic client as a real one.

## Brand Personality

Calm, plain-spoken, and quietly confident. The team's screen should feel like a colleague who has already read everything and will only interrupt when it matters. Client-facing surveys should feel like Designally's own work — considered, warm, unmistakably designed — because for many stakeholders the questionnaire is their first real experience of the agency.

Language is direct and unhedged. "Two things need you this morning" rather than "You have 2 pending items". Numbers are stated honestly: "2 of 3" rather than "67%".

## Anti-references

The team's screens must not resemble a project-management dashboard, a CRM, or an analytics tool. No stat tiles, no progress rings, no charts of things that cannot be counted, no badges competing for attention. A studio running three projects a month does not need a pipeline visualisation; it needs a short list of sentences.

Client-facing surveys must not resemble Google Forms, a corporate compliance questionnaire, or a marketing landing page. No progress gamification, no encouragement copy, no illustrations of abstract people.

Nothing in the product should imply the software is deciding. The interface never says "recommended", "AI suggests", or "smart" about its own output.

## Design Principles

1. **Priority is expressed as form, not labels.** Work blocked on the team sits at the top on a white surface with the largest type and the only accent-coloured buttons. Work waiting on the client sits below with no container at all — the absence of a card is the demotion. Templates and finished projects live behind one quiet line at the bottom.
2. **An empty screen is success.** When nothing needs the team, say so plainly and let them close the laptop. Never manufacture activity to fill space.
3. **Colour carries one meaning.** The accent means "a person is needed here" and appears on under ten percent of the surface. If it stops meaning that, it stops working.
4. **The tool never decides on a timer.** It never closes a survey, confirms the insights, or archives a project by itself. It may notice that waiting has stopped being useful and ask; the answer belongs to a person, and the record stores who gave it.
5. **State what is true, not what is estimated.** Report counts that exist — "3 answers so far · last one 2 days ago". Do not extrapolate volumes, percentages, or confidence from small samples.
6. **Both languages, everywhere except the buttons.** Every client-facing question, heading, help line, placeholder and message exists in Thai and English. **Buttons are the one exception**, decided 13 August 2026: bilingual action labels wrapped to two lines on a phone and made the button the largest thing on screen, so navigation and action labels run in English alone. The exception is exactly that wide — it does not extend to step labels, system messages, or anything a respondent has to read to answer. Thai wraps differently and sits taller; layouts are tested in Thai before they are considered done.
7. **The client's own words survive the pipeline.** Quotes from stakeholders reach the insights verbatim, in the language they were written in.

## Accessibility & Inclusion

WCAG 2.2 AA as the baseline. Complete keyboard navigation with visible focus states; body text at or above 4.5:1 contrast and large text at or above 3:1; full `prefers-reduced-motion` alternatives for every animation. Status must never rely on colour alone — conflict severity and survey state each carry a text label as well as a colour.

Client surveys are answered on phones by people of every age and technical comfort, frequently in Thai. Touch targets are generous, the form saves as it goes, and no question is ever gated behind a previous answer being "correct".

Because buttons are English-only (principle 6), a Thai-only respondent depends on position and surrounding bilingual content to read an action. Keep actions in conventional positions, keep their number small, and never make a button the only carrier of a meaning.
