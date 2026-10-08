---
title: Every survey has a date to answer by, and it cannot be removed
app: survey
decided: "2026-08-19"
author: ai
sources:
  - https://github.com/designally-co/survey/blob/8138b0ea4240133a123fac53b6deff802c013d61/CLAUDE.md?plain=1#L184-L203
---

## Decision

The date is chosen when the survey is created (prefilled at 14 days) and can be changed but not removed. A survey is closed when a person presses Close now or when the date passes; the client sees the same screen either way. Closing early moves the date to that moment, and reopening requires a new date. The date never writes closed_at or closed_by; those record only what a person did.

## Why

A survey with no date takes answers until somebody remembers to close it, and this stops remembering from being anybody's job. Before, a survey a week past its date still read as open while its link turned clients away and its answers sat unread.
