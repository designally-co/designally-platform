---
title: Confirming the insights is no longer a gate in the app
app: survey
decided: "2026-08-18"
author: ai
sources:
  - https://github.com/designally-co/survey/blob/8138b0ea4240133a123fac53b6deff802c013d61/CLAUDE.md?plain=1#L205-L216
---

## Context

There were four human gates. One was a person confirming the insights before anything went further.

## Decision

Two gates remain: close collection, and archive the project, each recording who acted and when. The app no longer asks anyone to confirm the insights. insights.confirmed_at and confirmed_by are kept in place, because real signatures were written there.

## Why

The platform collects the answers and writes the insights, and stops there. Asking a person to countersign the last thing it produces was the app holding a door it does not own. Reading the analysis is still the team's practice (it can mistake two wordings of one idea for a disagreement), but the software does not enforce it.
