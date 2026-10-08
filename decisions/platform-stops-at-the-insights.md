---
title: The platform stops at the insights; the kick-off and the stages are gone
app: survey
decided: "2026-08-17"
author: ai
sources:
  - https://github.com/designally-co/survey/blob/8138b0ea4240133a123fac53b6deff802c013d61/PRODUCT.md?plain=1#L51-L56
  - https://github.com/designally-co/survey/blob/8138b0ea4240133a123fac53b6deff802c013d61/CLAUDE.md?plain=1#L353-L357
---

## Context

There were two more steps and a fourth gate after the summary: build a kick-off deck in Claude, run the kick-off, and record what was decided. A five-stage meter (Lead, Proposal, Survey, Analysis, Kick-off) showed where each project was.

## Decision

The platform now stops at the summary (the insights). The kick-off steps, the engine's deck outline and room notes, the What's coming sheet, the question template panel and the five-stage meter were removed. projects.stage, projects.kickoff_at and the decisions table are retired in place: never written, never read, never dropped.

## Why

Everything after the summary (the deck, the meeting, the record of what was settled) is the team's work, done in the team's own tools.
