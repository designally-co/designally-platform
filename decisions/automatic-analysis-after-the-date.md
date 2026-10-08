---
title: The analysis runs by itself once a survey's date has passed
app: survey
decided: "2026-08-20"
author: ai
sources:
  - https://github.com/designally-co/survey/blob/8138b0ea4240133a123fac53b6deff802c013d61/CLAUDE.md?plain=1#L366-L373
---

## Context

The team asked for this.

## Decision

A daily job finds every unarchived survey past its date that has answers but no analysis, and writes one. It writes an insights row and nothing else, so the human gates stay human. It needs CRON_SECRET and refuses to run without it, because it spends money at Anthropic.

## Why
